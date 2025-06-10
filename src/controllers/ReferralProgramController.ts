import { Request, Response } from "express";
import { ReferralProgramService } from "../services/ReferralProgramService";
import { AppError } from "../utils/AppError";
import { validationResult } from "express-validator";

export class ReferralProgramController {
  private programService: ReferralProgramService;

  constructor() {
    this.programService = new ReferralProgramService();
  }

  createProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const program = await this.programService.createProgram(req.body);

      res.status(201).json({
        success: true,
        data: program,
        message: "Referral program created successfully",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  updateProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const program = await this.programService.updateProgram(
        Number.parseInt(id),
        req.body,
      );

      res.status(200).json({
        success: true,
        data: program,
        message: "Referral program updated successfully",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  getPrograms = async (req: Request, res: Response): Promise<void> => {
    try {
      const page = Number.parseInt(req.query.page as string) || 1;
      const limit = Number.parseInt(req.query.limit as string) || 10;

      const result = await this.programService.getPrograms(page, limit);

      res.status(200).json({
        success: true,
        data: result.programs,
        pagination: {
          page,
          limit,
          total: result.total,
          pages: Math.ceil(result.total / limit),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  getProgramById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const program = await this.programService.getProgramById(
        Number.parseInt(id),
      );

      res.status(200).json({
        success: true,
        data: program,
      });
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  getActiveProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const program = await this.programService.getActiveProgram();

      res.status(200).json({
        success: true,
        data: program,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };

  activateProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const program = await this.programService.activateProgram(
        Number.parseInt(id),
      );

      res.status(200).json({
        success: true,
        data: program,
        message: "Referral program activated successfully",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };

  deactivateProgram = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const program = await this.programService.deactivateProgram(
        Number.parseInt(id),
      );

      res.status(200).json({
        success: true,
        data: program,
        message: "Referral program deactivated successfully",
      });
    } catch (error) {
      console.error(error);
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  };
}
