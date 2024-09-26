// Import statements
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import figlet from 'figlet';
import { fileURLToPath } from 'url';
import { log, logDelay, delay } from './src/config/helpers.js'
import { Moonbix } from './src/api/info.js'
import { GamesAPI } from './src/api/games.js'

// Helper to handle __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurations
const CONFIG_PATH = path.join(__dirname, 'config.json');
const ACCOUNT_PATH = path.join(__dirname, 'account.json');
const PROXY_FILE = path.join(__dirname, 'proxy.txt');

// Initialize config
let config = {
  auto_task: true,
  auto_game: true,
  min_points: 100,
  max_points: 300,
  interval_minutes: 60
};

// Load configuration
if (fs.existsSync(CONFIG_PATH)) {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} else {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
}

// Load accounts and proxies
const accounts = JSON.parse(fs.readFileSync(ACCOUNT_PATH, 'utf-8'));
const arrayAccounts = Object.entries(accounts).map(([name, query]) => ({
  name,
  query
}));

//! Under development
const proxies = fs.existsSync(PROXY_FILE) ? fs.readFileSync(PROXY_FILE, 'utf-8').split('\n').filter(line => line.trim()) : [];

//todo Function to Running Game
const runBulkGame = async function(data, proxy, skip_task = false) {
  try {
    const mooonbix = new Moonbix(data.name, data.query, proxy);

    await mooonbix.getAccessToken()
    await mooonbix.getUserInfo(true)

    const GameAPI = new GamesAPI(mooonbix);

    if(!skip_task){
      if (config.auto_task) {
        await GameAPI.startCompleteTasks();
      }
    }

    if (config.auto_game) {
      await GameAPI.autoPlayGame();
    }

    await mooonbix.getUserInfo()

    await logDelay(`✅ Account Processing Complete`, 1000, data.name, 'success');
    await logDelay(`⛏️ Next Ticket in ${mooonbix.game_refresh_ticket.date}`, 1000, data.name, 'warning');
    await logDelay(`💤 Sleep ${mooonbix.game_refresh_ticket.message}`, mooonbix.game_refresh_ticket.time, data.name, 'info');

    await runBulkGame(data, proxy, true)

  } catch (error) {
    log(`${error}`, data.name, 'error');
  }
}

const showBanner = async () => {
   //? Clear the console
   console.clear();
    
   //? Display banner
   figlet("Rogersovich", function (err, data) {
     if (err) {
       console.log("Something went wrong...");
       console.dir(err);
       return;
     }
     console.log(data);
   });
 
   
   await delay(1000)
 
   console.log(chalk.green(`  Auto Claim Bot For BinanceMoonBix - by Rogersovich 🔥`))
   console.log(chalk.green(`  Santai aja garap, Use it wisely 🧩`))
   console.log(chalk.green(`  Dont waste your time, Happy farming 🌿`))
   console.log('')
 
   await delay(1000)
}

async function main() {
  await showBanner()

  const promiseList = arrayAccounts.map((data, index) => {
    const proxy = proxies[index] || null
    return runBulkGame(data, proxy, index);
  });

  await Promise.all(promiseList);
  
}

// Call the main function
main().catch(error => {
  console.error("Error in bot execution:", error);
});
