import type { Request, Response } from "express";
import { WalletService } from "../services/WalletService";
import { validationResult } from "express-validator";
import {
  WalletResponseDto,
  SendPaymentDto,
  createApiResponse,
  createErrorResponse,
} from "../dtos/WalletDTO";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";

// Helper function to safely extract error message
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
};

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async getWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      // Convert number to string since your auth middleware provides number but service expects string
      const userIdString = userId.toString();

      let wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        wallet = await this.walletService.createWallet(userIdString);
      }

      const walletDto = plainToClass(WalletResponseDto, {
        id: wallet.id,
        status: wallet.status,
        publicKey: wallet.publicKey,
        isVerified: wallet.isVerified,
        settings: wallet.settings,
        createdAt: wallet.createdAt.toISOString(),
        updatedAt: wallet.updatedAt.toISOString(),
      });

      res.json(createApiResponse(walletDto));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async getBalance(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const balances = await this.walletService.getWalletBalances(wallet.id);
      res.json(createApiResponse(balances));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async getTransactions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Math.min(
        Number.parseInt(req.query.limit as string) || 20,
        100,
      );
      const sort = (req.query.sort as "asc" | "desc") || "desc";

      const result = await this.walletService.getTransactions(
        wallet.id,
        page,
        limit,
        sort,
      );
      res.json(createApiResponse(result));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async getTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const transaction = await this.walletService.getTransactionById(id);

      if (!transaction) {
        return res
          .status(404)
          .json(createErrorResponse("Transaction not found"));
      }

      // Ensure user owns this transaction
      if (transaction.wallet.userId !== userIdString) {
        return res.status(403).json(createErrorResponse("Access denied"));
      }

      res.json(createApiResponse(transaction));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async getAddress(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      res.json(createApiResponse({ address: wallet.publicKey }));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async sendPayment(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json(
          createErrorResponse("Validation failed", "VALIDATION_ERROR", {
            validationErrors: errors.array(),
          }),
        );
      }

      const sendPaymentDto = plainToClass(SendPaymentDto, req.body);
      const validationErrors = await validate(sendPaymentDto);

      if (validationErrors.length > 0) {
        return res.status(400).json(
          createErrorResponse("DTO validation failed", "DTO_VALIDATION_ERROR", {
            validationErrors: validationErrors,
          }),
        );
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const { destinationAddress, amount, assetCode, assetIssuer, memo } =
        sendPaymentDto;

      const transaction = await this.walletService.sendPayment(
        wallet.id,
        destinationAddress,
        amount,
        assetCode,
        assetIssuer,
        memo,
      );

      res
        .status(201)
        .json(createApiResponse(transaction, "Payment sent successfully"));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      if (errorMessage.includes("insufficient")) {
        return res
          .status(400)
          .json(
            createErrorResponse("Insufficient funds", "INSUFFICIENT_FUNDS"),
          );
      }
      if (errorMessage.includes("Invalid")) {
        return res
          .status(400)
          .json(createErrorResponse(errorMessage, "INVALID_INPUT"));
      }
      res.status(500).json(createErrorResponse(errorMessage));
    }
  }

  async activateWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const activatedWallet = await this.walletService.activateWallet(
        wallet.id,
      );
      res.json(
        createApiResponse(activatedWallet, "Wallet activated successfully"),
      );
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async verifyWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const verifiedWallet = await this.walletService.verifyWallet(wallet.id);
      res.json(
        createApiResponse(verifiedWallet, "Wallet verified successfully"),
      );
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async updateSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const updatedWallet = await this.walletService.updateWalletSettings(
        wallet.id,
        req.body,
      );
      res.json(
        createApiResponse(
          updatedWallet,
          "Wallet settings updated successfully",
        ),
      );
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async estimateFee(req: Request, res: Response) {
    try {
      const operationCount =
        Number.parseInt(req.query.operations as string) || 1;

      if (operationCount < 1 || operationCount > 100) {
        return res
          .status(400)
          .json(
            createErrorResponse(
              "Invalid operation count. Must be between 1 and 100",
            ),
          );
      }

      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const estimatedFee =
        await this.walletService.estimateTransactionFee(operationCount);

      res.json(
        createApiResponse({
          estimatedFee,
          operationCount,
          currency: "XLM",
          note: "Fee is estimated in stroops (1 XLM = 10,000,000 stroops)",
        }),
      );
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async getWalletInfo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      const walletInfo = await this.walletService.getWalletInfo(wallet.id);
      res.json(createApiResponse(walletInfo));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }

  async syncTransactions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json(createErrorResponse("User ID not found in request"));
      }

      const userIdString = userId.toString();
      const wallet = await this.walletService.getWalletByUserId(userIdString);

      if (!wallet) {
        return res.status(404).json(createErrorResponse("Wallet not found"));
      }

      await this.walletService.syncTransactionsFromBlockchain(wallet.id);
      res.json(createApiResponse(null, "Transactions synced successfully"));
    } catch (error: unknown) {
      res.status(500).json(createErrorResponse(getErrorMessage(error)));
    }
  }
}
