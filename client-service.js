const cron = require('node-cron');
const axios = require('axios');

const exaComputeBackendUrl = 'https://exa-compute-backend.exa.show/'

cron.schedule('*/1 * * * * *', async () => {
  console.log('running a task every minute');
  const res = await axios.get(exaComputeBackendUrl + 'health');
  console.log(res.data);
});