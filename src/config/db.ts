import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/User';
import { TwoFactorAuth } from '../entities/TwoFactorAuth';
import { Session } from '../entities/Session';
import { EmailVerification } from '../entities/emailVerification';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    synchronize: true,
    dropSchema: false,   
    logging: true,      
    entities: [
        User,
        TwoFactorAuth,
        Session,
        EmailVerification
    ],
});

export default AppDataSource;
