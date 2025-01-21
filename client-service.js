const cron = require('node-cron');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const { default: axios } = require('axios');
const AdmZip = require('adm-zip');
const clientVersion = require('./version');

const exaComputeBackendUrl = 'https://exa-compute-backend.exa.show/'
const exaComputeToken = process.env.EXA_COMPUTE_TOKEN;

// console.log("Getting all Env Variables ", process.env);
console.log("Exacompute Token ", exaComputeToken);

const clientMachineId = execSync("cat /etc/machine-id").toString().trim();
const headers = { 
  'Authorization': `Bearer ${exaComputeToken}`,
  'clientMachineId': `${clientMachineId}`,
  'clientVersion': `${clientVersion}`
}

console.log("headers ", headers);

// Update client Version On the server
axios.post(exaComputeBackendUrl + 'machine/updateClient',  { clientVersion, clientMachineId }, {
  headers: headers
}).then(response => {
  // Client Version Updated Successfully
  console.log("Client Version Updated successfully ", response.data);

  // Send Device Details To server
  console.log("Running lshw to get the device details");
  const devicedetailJson = JSON.parse(execSync('sudo lshw -json').toString());
  console.log("Fetched details successfully", devicedetailJson);

  axios.post(exaComputeBackendUrl + 'deviceDetails',  devicedetailJson, {
      headers: headers
  }).then(response => {
    console.log("Device details successfully sent to server ", response.data);
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

    let res = await axios.post(exaComputeBackendUrl + 'sysInfo',  systemInfoJson, {
      headers: headers
  });
  console.log(res);
  
  } catch (error) {
    console.error('Error executing command:', error.message);
  }
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