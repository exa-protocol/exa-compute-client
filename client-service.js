const cron = require('node-cron');
const axios = require('axios');
const { execSync } = require('child_process');


const exaComputeBackendUrl = 'https://exa-compute-backend.exa.show/'
const exaComputeToken = process.env.EXA_COMPUTE_TOKEN;
console.log(process.env);
console.log(exaComputeToken);
cron.schedule('*/10 * * * * *', async () => {
  console.log('running a task every minute');
  const devicedetailJson = JSON.parse(execSync('sudo lshw -json').toString());
	console.log(exaComputeToken);
	console.log(process.env);
	console.log(devicedetailJson);
	let res = await axios.post(exaComputeBackendUrl + 'deviceDetails',  devicedetailJson, {
      headers: { 'Authorization': `Bearer ${exaComputeToken}` }
  });
  console.log(res);
});