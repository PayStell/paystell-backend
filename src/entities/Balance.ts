import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity("balances")
export class Balance {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  walletId: string

  @Column()
  assetCode: string

  @Column({ nullable: true })
  assetIssuer: string

  @Column("decimal", { precision: 20, scale: 7 })
  balance: string
  @Column({ nullable: true })
  assetType: string

  @Column({ default: true })
  isAuthorized: boolean

  @Column({ default: true })
  isAuthorizedToMaintainLiabilities: boolean

  @Column({ default: false })
  isClawbackEnabled: boolean

  @Column({ nullable: true })
  lastModifiedLedger: string

  @Column({ nullable: true })
  limit: string

  @Column({ nullable: true })
  sponsor: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
