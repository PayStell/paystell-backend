import axios from 'axios';

// This needs to be changed depending on the Stellar network you are using Mainet or testnet
//testnet
//prove with this GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
const HORIZON_API_URL = 'https://horizon-testnet.stellar.org/accounts/';
//mainet
// const HORIZON_API_URL = 'https://horizon.stellar.org/accounts/';


export const isValidStellarAddress = (address: string): boolean => {
    return typeof address === 'string' && address.length === 56 && address.startsWith('G');
};


export const checkStellarWalletExists = async (address: string): Promise<boolean> => {
    if (!isValidStellarAddress(address)) {
        throw new Error('Invalid Stellar wallet address format.');
    }

    try {
        await axios.get(`${HORIZON_API_URL}${address}`);
        return true;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return false; // The account does not exist
        }
        throw new Error(`Error checking Stellar account: ${error.message}`);
    }
};
