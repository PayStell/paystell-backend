import { IsEmail, IsNotEmpty, Length, IsEnum } from "class-validator";
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn} from "typeorm" //OneToOne } from "typeorm" 
import { UserRole } from "../enums/UserRole"
//import { TwoFactorAuth } from "./TwoFactorAuth"

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number

    @Column()
    @IsNotEmpty()
    name!: string

    @Column({ unique: true })
    @IsEmail()
    email!: string

    @Column()
    @Length(6, 15) // could vary
    password!: string

    @Column({ 
         type: 'enum',
         enum: UserRole,
         default: UserRole.USER
     })
    @IsEnum(UserRole)
    role!: UserRole

    @Column({ nullable: true })
    description?: string

    @Column({ nullable: true })
    logoUrl?: string

    @Column({ nullable: true })
    walletAddress?: string

    @Column({ default: false })
    isEmailVerified!: boolean

    @Column({ default: false })
    isWalletVerified!: boolean

    //Implement once TwoFactorAuth entity is created
    // @OneToOne(() => TwoFactorAuth, tfa => tfa.user)
    // twoFactorAuth!: TwoFactorAuth

    @CreateDateColumn()
    createdAt!: Date

    @UpdateDateColumn()
    updatedAt!: Date
}