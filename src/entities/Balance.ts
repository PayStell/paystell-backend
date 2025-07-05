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

  @Column("decimal", { precision: 20, scale: 7, nullable: true })
  buyingLiabilities: string

  @Column("decimal", { precision: 20, scale: 7, nullable: true })
  sellingLiabilities: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
