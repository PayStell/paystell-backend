import { Repository } from "typeorm";
import { ReferralProgram } from "../entities/ReferralProgram";
import AppDataSource from "../config/db";
import {
  CreateReferralProgramDTO,
  UpdateReferralProgramDTO,
} from "../dtos/ReferralProgramDTO";
import { AppError } from "../utils/AppError";
import { ProgramStatus } from "../enums/ProgramStatus";

export class ReferralProgramService {
  private programRepository: Repository<ReferralProgram>;

  constructor() {
    this.programRepository = AppDataSource.getRepository(ReferralProgram);
  }

  async createProgram(
    programData: CreateReferralProgramDTO,
  ): Promise<ReferralProgram> {
    // Check if there's already an active program
    const activeProgram = await this.programRepository.findOne({
      where: { status: ProgramStatus.ACTIVE },
    });

    if (activeProgram) {
      throw new AppError("There is already an active referral program", 400);
    }

    const program = this.programRepository.create({
      ...programData,
      referrerReward: programData.referrerReward.toString(),
      refereeReward: programData.refereeReward.toString(),
      totalBudget: programData.totalBudget?.toString(),
      startDate: new Date(programData.startDate),
      endDate: programData.endDate ? new Date(programData.endDate) : undefined,
      status: ProgramStatus.DRAFT,
      usedBudget: "0",
    });

    return await this.programRepository.save(program);
  }

  async updateProgram(
    id: number,
    updateData: UpdateReferralProgramDTO,
  ): Promise<ReferralProgram> {
    const program = await this.programRepository.findOne({ where: { id } });
    if (!program) {
      throw new AppError("Referral program not found", 404);
    }

    // If activating a program, deactivate others
    if (updateData.status === ProgramStatus.ACTIVE) {
      await this.programRepository.update(
        { status: ProgramStatus.ACTIVE },
        { status: ProgramStatus.INACTIVE },
      );
    }

    const updatedProgram = {
      ...updateData,
      referrerReward: updateData.referrerReward?.toString(),
      refereeReward: updateData.refereeReward?.toString(),
      totalBudget: updateData.totalBudget?.toString(),
      startDate: updateData.startDate
        ? new Date(updateData.startDate)
        : undefined,
      endDate: updateData.endDate ? new Date(updateData.endDate) : undefined,
    };

    await this.programRepository.update(id, updatedProgram);
    return (await this.programRepository.findOne({
      where: { id },
    })) as ReferralProgram;
  }

  async getPrograms(
    page = 1,
    limit = 10,
  ): Promise<{ programs: ReferralProgram[]; total: number }> {
    const [programs, total] = await this.programRepository.findAndCount({
      order: { createdAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { programs, total };
  }

  async getProgramById(id: number): Promise<ReferralProgram> {
    const program = await this.programRepository.findOne({ where: { id } });
    if (!program) {
      throw new AppError("Referral program not found", 404);
    }
    return program;
  }

  async getActiveProgram(): Promise<ReferralProgram | null> {
    return await this.programRepository.findOne({
      where: { status: ProgramStatus.ACTIVE },
    });
  }

  async deactivateProgram(id: number): Promise<ReferralProgram> {
    const program = await this.getProgramById(id);
    program.status = ProgramStatus.INACTIVE;
    return await this.programRepository.save(program);
  }

  async activateProgram(id: number): Promise<ReferralProgram> {
    // Deactivate all other programs first
    await this.programRepository.update(
      { status: ProgramStatus.ACTIVE },
      { status: ProgramStatus.INACTIVE },
    );

    const program = await this.getProgramById(id);
    program.status = ProgramStatus.ACTIVE;
    return await this.programRepository.save(program);
  }
}
