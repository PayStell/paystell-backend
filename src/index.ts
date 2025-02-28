import "reflect-metadata" ;
import app from './app';
import AppDataSource from './config/db';

async function main () {

try {
    // await AppDataSource.initialize();
    app.listen(3000);
    console.log('Sever is listening on port', 3000);
} catch (error) {
    console.log(error);
}
}

main();