import { DataSource } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE,
    synchronize: true,
    logging: process.env.NODE_ENV === 'development',  // Solo loguea en desarrollo
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,  // Usa SSL solo en producción
    entities: [__dirname + '/../entities/*.{ts,js}'],
    migrations: [__dirname + '/../migrations/*.{ts,js}'],
});

export default AppDataSource;
