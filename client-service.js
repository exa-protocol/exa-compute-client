const cron = require('node-cron');
const axios = require('axios');
const { execSync } = require('child_process');


const exaComputeBackendUrl = 'https://exa-compute-backend.exa.show/'
const exaComputeToken = process.env.EXA_COMPUTE_TOKEN;
console.log(process.env);
console.log(exaComputeToken);


const devicedetailJson = JSON.parse(execSync('sudo lshw -json').toString());
console.log(exaComputeToken);
console.log(process.env);
console.log(devicedetailJson);
let res = axios.post(exaComputeBackendUrl + 'deviceDetails',  devicedetailJson, {
    headers: { 'Authorization': `Bearer ${exaComputeToken}` }
});

cron.schedule('* * * * *', async () => {

console.log("Running cron every minute");

try {
  const cpuUsage = execSync(`
    CPU_IDLE=$(top -bn1 | grep "Cpu(s)" | awk -F'[, ]+' '{print $8}')
    CPU_USED=$(echo "scale=2; 100 - $CPU_IDLE" | bc)
    echo $CPU_USED
  `).toString().trim();

  const memoryUsage = execSync(`
    free -m | awk 'NR==2{printf "{\\"total\\": \\"%s\\", \\"used\\": \\"%s\\", \\"free\\": \\"%s\\"}", $2, $3, $4}'
  `).toString().trim();
  
  const diskUsage = execSync(`
    df -h --output=source,size,used,avail,pcent,target | tail -n +2 |
    awk 'BEGIN {print "["} {printf "{\\"filesystem\\": \\"%s\\", \\"size\\": \\"%s\\", \\"used\\": \\"%s\\", \\"available\\": \\"%s\\", \\"used_percent\\": \\"%s\\", \\"mount\\": \\"%s\\"},", $1, $2, $3, $4, $5, $6} END {print "]"}' |
    sed 's/,]/]/'
  `).toString();

  systemInfoJson = {
    "cpu": {
      "used_percent": cpuUsage,
    },
    "memory": JSON.parse(memoryUsage),
    "storage": JSON.parse(diskUsage),
  }

} catch (error) {
  console.error('Error executing command:', error.message);
}
  let res = await axios.post(exaComputeBackendUrl + 'sysInfo',  systemInfoJson, {
      headers: { 'Authorization': `Bearer ${exaComputeToken}` }
  });
  console.log(res);
});


