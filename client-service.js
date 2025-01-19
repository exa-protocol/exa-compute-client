const cron = require('node-cron');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { default: axios } = require('axios');
const AdmZip = require('adm-zip');
const clientVersion = require('./version');

const exaComputeBackendUrl = 'https://exa-compute-backend.exa.show/'
const exaComputeToken = "exacompute.J9FO888LWYS2QNN5ADI24X6A8GJ2WV1LPERVI35J86JW1C7THRKV6I51A2EFXML2R3VFSDEV6MP20IAY46RL8X864RPUB60OU248HADLWIMRI0UAVLEAPJV1IAGIZQDI6SZZBVMGM03A5AABE62KQD4LZ6G9H38LKHLV351QE5RA8K0OKSJU12MBHGKECG8LSGNCY2055HC3CVIO6MMLQZTHK2AP2D7UN4X50BGRJWUH90WKU18I0D5ADPC8X0TX"
// const exaComputeBackendUrl = 'http://localhost:3000/'
// const exaComputeToken = "35b1a3c1-881e-44ae-b6de-21e47b2f2efc";

console.log("Getting all Env Variables ", process.env);
console.log("Exacompute Token ", exaComputeToken);

const machineId = execSync("cat /etc/machine-id").replace(/^\s+|\s+$/g, '');
const headers = { 
  'Authorization': `Bearer ${exaComputeToken}`,
  'machineId': `${machineId}`,
  'clientVersion': `${clientVersion}`
}

console.log("headers ", headers);

// Update client Version On the server
axios.post(exaComputeBackendUrl + 'machine/updateClient',  { clientVersion }, {
  headers: headers
}).then(response => {
  // Client Version Updated Successfully
  console.log("Client Version Updated successfully ", response);

  // Send Device Details To server
  console.log("Running lshw to get the device details");
  const devicedetailJson = JSON.parse(execSync('sudo lshw -json').toString());
  console.log("Fetched details successfully", devicedetailJson);

  axios.post(exaComputeBackendUrl + 'deviceDetails',  devicedetailJson, {
      headers: headers
  }).then(response => {
    console.log("Device details successfully sent to server ", response);
    // Update SysInfo every Minutes
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
        headers: headers
    });
    console.log(res);
  });

  }).catch(err => {
    console.log("Device details sent to server unsuccessfully ", err);
  });
}).catch(err => {
  console.log("Client Version Updated unsuccessfully ", err);
})


// Fetch Tasks

// cron.schedule('*/10 * * * * *', async () => {
//   console.log("Running cron every minute to fetch tasks");
  
//   let res = await axios.get(exaComputeBackendUrl + 'tasks', {
//       headers: headers
//   });
//     console.log(res.data);

//     res.data.forEach(async task => {
//       console.log("in task", task);
//       if(task.status != "PENDING" || task.taskFileUrl == null || task.taskFileUrl == undefined) {
//         return;
//       }
//       const outputFolderDir = '/var/tmp/exa-compute/' + task._id;
//       const fileUrl = task.taskFileUrl;
//       const fileName = fileUrl.split("/").filter(Boolean).pop();
      
//       // Zip output file path
//       const outputPath = path.join(outputFolderDir, fileName);

//       // Unzipped file Dockerfile path
//       const dockerFileDirPath = path.join(outputFolderDir, fileName.replace(".zip", ""));
//       const dockerOutPutDirPath = path.join(dockerFileDirPath, 'output');

//       if (!fs.existsSync(outputFolderDir)){
//         console.log("in here", task);
//         fs.mkdirSync(outputFolderDir, { recursive: true });
//       }

//       // Fetch the file using Axios
//       const response = await axios({
//         url: fileUrl,
//         method: "GET",
//         responseType: "stream", // Stream the response for large files
//       });

//       // Pipe the response data to a file
//       const writer = fs.createWriteStream(outputPath);
//       response.data.pipe(writer);

//       // Wait for the file to finish writing
//       writer.on("finish", () => {
//         console.log("File downloaded successfully:", outputPath);
//         const zip = new AdmZip(outputPath);
//         zip.extractAllTo(outputFolderDir, true);  // 'true' overwrites existing files
//         console.log("File successfully unzipped:", outputFolderDir);
//         const result = execSync('sudo docker --version', { encoding: 'utf-8' });
//         console.log('docker result ' + result);
//         // execSync('sudo docker build -t app ' + dockerFileDirPath);
//         // execSync('sudo docker run -v ./local_output:' + dockerOutPutDirPath + ' app > output.log 2>&1');
//       });

//       writer.on("error", (err) => {
//         console.error("Error writing file:", err);
//       });

//     });
//   });