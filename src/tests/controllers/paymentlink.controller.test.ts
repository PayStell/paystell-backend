import { Request, Response } from "express";
import { PaymentLinkController } from "../../controllers/PaymentLink.controller";
import { PaymentLinkService } from "../../services/PaymentLink.services";
import { PaymentLink } from "../../entities/PaymentLink";
import { jest } from "@jest/globals";

jest.mock("../../services/PaymentLink.services");

describe("PaymentLinkController", () => {
  let paymentLinkController: PaymentLinkController;
  let paymentLinkService: jest.Mocked<PaymentLinkService>;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let sendMock: jest.Mock;

  beforeEach(() => {
    paymentLinkService = {
      getPaymentLinkById: jest.fn(),
      updatePaymentLink: jest.fn(),
    } as unknown as jest.Mocked<PaymentLinkService>;

    paymentLinkController = new PaymentLinkController();
    // @ts-expect-error - Needed for dependency injection in tests
    paymentLinkController.paymentLinkService = paymentLinkService;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: jest.fn() });
    sendMock = jest.fn();

    res = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
    } as Partial<Response>;
  });

  it("should return a payment link by ID", async () => {
    const mockPaymentLink: PaymentLink = {
      id: "1",
      name: "Test Payment",
    } as PaymentLink;
    paymentLinkService.getPaymentLinkById.mockResolvedValue(mockPaymentLink);

    req = { params: { id: "1" } } as Partial<Request>;

    await paymentLinkController.getPaymentLinkById(
      req as Request,
      res as Response,
    );

    expect(paymentLinkService.getPaymentLinkById).toHaveBeenCalledWith("1");
    expect(jsonMock).toHaveBeenCalledWith(mockPaymentLink);
  });

  it("should return 404 if payment link is not found", async () => {
    paymentLinkService.getPaymentLinkById.mockResolvedValue(null);

    req = { params: { id: "999" } } as Partial<Request>;

    await paymentLinkController.getPaymentLinkById(
      req as Request,
      res as Response,
    );

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ message: "PaymentLink not found" });
  });

  it("should update a payment link", async () => {
    const mockUpdatedPaymentLink: PaymentLink = {
      id: "1",
      name: "Updated Payment",
    } as PaymentLink;
    paymentLinkService.updatePaymentLink.mockResolvedValue(
      mockUpdatedPaymentLink,
    );

    req = {
      params: { id: "1" },
      body: { name: "Updated Payment" },
    } as Partial<Request>;

    await paymentLinkController.updatePaymentLink(
      req as Request,
      res as Response,
    );

    expect(paymentLinkService.updatePaymentLink).toHaveBeenCalledWith(
      "1",
      req.body,
    );
    expect(jsonMock).toHaveBeenCalledWith(mockUpdatedPaymentLink);
  });

  it("should return 404 when updating a non-existent payment link", async () => {
    paymentLinkService.updatePaymentLink.mockResolvedValue(null);

    req = {
      params: { id: "999" },
      body: { name: "Nonexistent Payment" },
    } as Partial<Request>;

    await paymentLinkController.updatePaymentLink(
      req as Request,
      res as Response,
    );

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ message: "PaymentLink not found" });
  });
});
