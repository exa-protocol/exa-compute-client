#!/usr/bin/env node

const p = require('@clack/prompts');
const { setTimeout } = require('node:timers/promises');
const color = require('picocolors');
const os = require('os');
const isInstalled = require('is-program-installed');
const fs = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');
const { default: axios } = require('axios');
const { platform } = require('node:os');
const clientVersion = require('./version');

const timeOut = 500;
const exaComputeServicePath = './exa-compute-client.service';
const exaComputeServiceDeliverPath = '/etc/systemd/system/exa-compute-client.service';
const deamonReloadCommand = 'sudo systemctl daemon-reload';
const startServiceCommand = 'sudo systemctl start exa-compute-client';
const enableServiceRunOnRestartCommand = 'sudo systemctl enable exa-compute-client';
const exaComputeBackendUrl = 'https://exa-compute-backend.exa.show/'

// Access the file bundled with the pkg executable
const servicePath = 
  './exa-compute-client.service';
 
const clientExecutablePath = 
  './client-service-linux';

async function main() {
    console.log(` _____                ____                _                        _ `);
    console.log(`| ____|__  __  __ _  |  _ \\  _ __   ___  | |_   ___    ___   ___  | |`);
    console.log(`|  _|  \\ \\/ / / _\` | | |_) || '__| / _ \\ | __| / _ \\  / __| / _ \\ | |`);
    console.log(`| |___  >  < | (_| | |  __/ | |   | (_) || |_ | (_) || (__ | (_) || |`);
    console.log(`|_____|/_/\\_\\ \\__,_| |_|    |_|    \\___/  \\__| \\___/  \\___| \\___/ |_|`);
    console.log(`\n`);
    p.intro(`${color.bgMagenta(color.black(' Welcome to the exa drive client. It will take couple of minutes to complete the process'))}`);
    const s = p.spinner();
    const log = p.log;
	await setTimeout(timeOut);

    s.start('Checking OS compatibility...');
    await setTimeout(timeOut);
    let operatingSystem = os.platform();
    if (operatingSystem != 'linux') {
        s.stop();
        p.cancel(`${color.red('Incompatible Operating System - Use Linux based operating system')}`);
        return;
    }

    p.outro(`${color.green('Compatible with current operating System ')}`);
    s.stop();

    s.start('Checking lxd dependency...');
    await setTimeout(timeOut);

    let isIns = isInstalled("lxd");

    if(!isIns) {
        s.stop();
        p.cancel(`${color.red('Dependency lxd is not install, please install lxd and start the process again')}`);
        return;
    }
    
    p.outro(`${color.green('lxd is installed')}`);
    s.stop();

    if (!fs.existsSync('/etc/exa.env')) {
        const value = await p.text({
            message: 'Please enter your exa drive secret token',
        });
    
        p.intro('Verifying your secret token');
        s.start('Verifying Token...');
        const clientMachineId = execSync("cat /etc/machine-id").toString().trim();
        try {
            let res = await axios.post(exaComputeBackendUrl + 'activateMachines',  { token: value, clientMachineId, clientType: "CLI", platform:  os.platform().toUpperCase(), clientversion: clientVersion }, {
                headers: { 'Authorization': `Bearer ${value}` }
            });
            s.stop();
            p.outro('Secret token verified');
          } catch (err) {
            s.stop();
            if(err.status == 403) {
                p.outro('Invalid token');
                return;
            } else {
                p.outro('Token verification falied');
            return;
            }
          }
    
        p.intro('Setting your secret token');
        s.start('Setting')

        try {
            execSync(`echo 'EXA_COMPUTE_TOKEN=${value}' >> /etc/exa.env`);
            s.stop();
            p.outro('Secret token has been successfully setup');
        } catch (err) {
            s.stop();
            return;
        }
        // execSync('. ~/.bashrc');
        
    } else {
        p.intro('Checking your secret token');
        p.outro('Token already present....');
    }

    s.start('Adding exa compute service...');
    await setTimeout(timeOut);

    s.message('Checking if exa compute service already exists...');
    await setTimeout(timeOut);

    if (fs.existsSync(exaComputeServiceDeliverPath)) {
        s.message('Service already exists');
        await setTimeout(timeOut);
        s.message('Reverifying existing service');
        s.stop();
        p.intro('Stopping currently running exa-compute service');
        s.start()
        execSync('sudo systemctl stop exa-compute-client.service');
        s.stop();
        p.outro('Stopped');
    } else {
        s.message('No service found... Adding exa compute service');
        await setTimeout(timeOut);
    }

    execSync('sudo cp ' + clientExecutablePath + ' /usr/local/bin/client-service-linux');
	execSync('sudo cp ' + servicePath + ' ' + exaComputeServiceDeliverPath);

    s.message('Exa compute Service added');
    await setTimeout(timeOut);
    s.stop();
    p.outro(`${color.green('Exa compute Service added successfully')}`);


    p.intro('Reloading systemd to recognise new service');
    s.start('Wait...');
    log.info('Running sudo systemctl daemon-reload');
    let stdout = execSync(deamonReloadCommand);
    s.message('Reloading systemd is successful');
    s.stop();


    p.intro('Starting the exa compute client service');
    s.start('Wait...');
    log.info('Running sudo systemctl start exa-compute');
    stdout = execSync(startServiceCommand);
    s.message('Service started successfully');
    s.stop();

    p.intro('Enabling the service to run at boot');
    s.start('Wait...');
    log.info('Running sudo systemctl start exa-compute');
    stdout = execSync(enableServiceRunOnRestartCommand);
    s.message('Service enabled successfully');
    s.stop();
}

main().catch(console.error);