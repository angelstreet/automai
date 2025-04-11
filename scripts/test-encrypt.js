import { createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = 'wNXX8ukmlBT0y8wjpWnE/HbEmQSN/IBslQbDvail2Fc=';
const encrypted =
  '05d419acb27e10d95c7167c590a29d48:e87a005ec796a97e085520443400b967:e4ca2f06c53d53eed23243e04f9cc86ba365e5ac2d8ceb79fc4ddf777a923f6555d8240b1f966b4b608b92dda54aba036db1777500d074d690a3404ff6455aa77f9eef231fa50fc6d0cf0916e39da48768444db7ba19d7672c5ce884b3917927730851e2d4430fa269779686fe9d75dd3e3fb53996603c00798067278750c429bcc8cfb161a58d18208bde59abc893d18bc5a9bd5356f8faff7e409f6602c9bc3afcaadaafc14e8f3133ceb6880181796fd052d754605b802b4feefba57246de383ab31398ecf751a3ea8293626b0a95e4fd3d1612be84e8e825075eec186ebd7cda9cec8de2e1419acb2f8140ce228d7035ced3fd5d1c3a5278df72ee99d3b370c66b6ac143d6a94f18abe82a70821698e496fe93c05c91a1b43137b5ee0a36025f1c5f9e0d3050afad8a2fbeca2c57b9883d62a296aa6fb21d7b4eefe4b42b9e5a2346347fed7cc4979ddb2a2167ae7380bf67d122b1cafd1f54d61c34e2d29f790f1c22a6a7d09b928dd051b31ec42c58ed48cc942bd42a385f7ec79948081ec448198b990eb022e44b0152206652e8f866644cd6ca67a3f9';

try {
  const [ivHex, encryptedData] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'base64');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  console.log('Decrypted key:', decrypted);
} catch (error) {
  console.error('Decryption error:', error.message);
}
