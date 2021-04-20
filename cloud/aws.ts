import {SharedIniFileCredentials, Credentials} from 'aws-sdk'

const key = process.env.AWS_KEY
const secret = process.env.AWS_SECRET

export const credentials = key && secret 
    ? new Credentials({accessKeyId:key, secretAccessKey:secret}) 
    : new SharedIniFileCredentials({profile:'default'})

export default credentials