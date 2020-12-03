import neode from './neode';

(async () => {
  await neode.driver
    .session()
    .writeTransaction(txc => txc.run('MATCH(n) DETACH DELETE n;'));
  neode.driver.close();
})();
