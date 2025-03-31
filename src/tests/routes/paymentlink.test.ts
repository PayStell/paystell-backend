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
      createPaymentLink: jest.fn(),
      deletePaymentLink: jest.fn(),
    } as unknown as jest.Mocked<PaymentLinkService>;

    paymentLinkController = new PaymentLinkController();
    (
      paymentLinkController as unknown as {
        paymentLinkService: PaymentLinkService;
      }
    ).paymentLinkService = paymentLinkService;

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock, send: jest.fn() });
    sendMock = jest.fn();

    res = {
      json: jsonMock,
      status: statusMock,
      send: sendMock,
    } as Partial<Response>;
  });

  it("should create a new payment link", async () => {
    const mockPaymentLink: PaymentLink = {
      id: "1",
      name: "New Payment",
    } as PaymentLink;
    paymentLinkService.createPaymentLink.mockResolvedValue(mockPaymentLink);

    req = { body: { name: "New Payment" } } as Partial<Request>;

    await paymentLinkController.createPaymentLink(
      req as Request,
      res as Response,
    );

    expect(paymentLinkService.createPaymentLink).toHaveBeenCalledWith(req.body);
    expect(jsonMock).toHaveBeenCalledWith(mockPaymentLink);
  });

  it("should delete a payment link", async () => {
    paymentLinkService.deletePaymentLink.mockResolvedValue(true);

    req = { params: { id: "1" } } as Partial<Request>;

    await paymentLinkController.deletePaymentLink(
      req as Request,
      res as Response,
    );

    expect(paymentLinkService.deletePaymentLink).toHaveBeenCalledWith("1");
    expect(statusMock).toHaveBeenCalledWith(204);
  });
});
