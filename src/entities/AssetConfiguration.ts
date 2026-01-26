import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("asset_configurations")
export class AssetConfiguration {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "merchant_id", type: "uuid" })
  merchantId: string;

  @Column({ name: "asset_code", type: "varchar", length: 12 })
  assetCode: string;

  @Column({ name: "asset_issuer", type: "varchar", length: 56, nullable: true })
  assetIssuer: string | null;

  @Column({ name: "is_enabled", type: "boolean", default: true })
  isEnabled: boolean;

  @Column({
    name: "min_amount",
    type: "decimal",
    precision: 20,
    scale: 7,
    default: "0",
  })
  minAmount: string;

  @Column({
    name: "max_amount",
    type: "decimal",
    precision: 20,
    scale: 7,
    nullable: true,
  })
  maxAmount: string | null;

  @Column({ name: "priority", type: "integer", default: 0 })
  priority: number;

  @Column({ name: "auto_convert", type: "boolean", default: false })
  autoConvert: boolean;

  @Column({
    name: "settlement_asset_code",
    type: "varchar",
    length: 12,
    nullable: true,
  })
  settlementAssetCode: string | null;

  @Column({
    name: "settlement_asset_issuer",
    type: "varchar",
    length: 56,
    nullable: true,
  })
  settlementAssetIssuer: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
