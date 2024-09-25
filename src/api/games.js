import axios from "axios";
import { API } from "./api.js";
import { delay, logDelay, getRandomUserAgent, log } from "../config/helpers.js";
import { getGameData } from "../config/encrypt.js"

export class GamesAPI extends API {
  constructor(moonbix) {
    super();

    this.proxy = moonbix.proxy;
    this.account_name = moonbix.account_name;
    this.access_token = moonbix.access_token;
    this.game_ticket = moonbix.game_ticket;
    this.tasks = null;
    this.game_response = null;
    this.game_data = null;
    this.game_traps = [];
    this.base_url = "https://www.binance.com/bapi/growth/v1";
  }

  async startCompleteTasks() {
    await this.getTaskList();

    //? Skip task if resourceId is 2058
    const uncompletedTasks = this.tasks.filter(
      (resourceId) => resourceId !== 2058
    );

    //? If no incomplete tasks found, log info
    if (!uncompletedTasks || uncompletedTasks.length === 0) {
      await logDelay(
        `🃏 Task: No incomplete tasks`,
        1000,
        this.account_name,
        "warning"
      );
      return;
    }

    await logDelay(
      `🃏 Task: Start completing tasks`,
      1000,
      this.account_name,
      "info"
    );

    //? Iterate through the task uncompletedTasks to complete them
    for (const resourceId of uncompletedTasks) {
      const success = await this.postCompleteTask(resourceId);

      if (success) {
        await logDelay(
          `🃏 Task: Complete task - ${resourceId}`,
          2000,
          this.account_name,
          "success"
        );
      } else {
        await logDelay(
          `🃏 Task: Uncomplete task - ${resourceId}`,
          2000,
          this.account_name,
          "error"
        );
      }

      // Adding delay of 3 seconds between tasks with logging
      await logDelay(
        `🤖 BOT: Sleep in 3 seconds`,
        3000,
        this.account_name,
        "warning"
      );
    }
  }

  async getTaskList() {
    return this.retryApiCall(
      async () => await this.runGetTaskList(),
      3, // max retries
      1000, // delay between retries
      this.account_name // account name for logging
    );
  }

  async runGetTaskList(){
    await logDelay(
      `🃏 Task: Fetching API Tasks`,
      1000,
      this.account_name,
      "info"
    );
    const url = `${this.base_url}/friendly/growth-paas/mini-app-activity/third-party/task/list`;

    const data = await this.fetch(url, "POST", this.access_token, {
      resourceId: 2056,
    });

    if (data.code !== "000000" || !data.success) {
      throw new Error(`🤖 Cannot get task list: ${data.message}`);
    }

    //? Extracting task list
    const taskList = data?.data?.data[0]?.taskList?.data || [];

    //? Returning resourceIds of incomplete tasks
    const filteredTask = taskList
      .filter((task) => task.completedCount === 0)
      .map((task) => task.resourceId);

    this.tasks = filteredTask;

    return data;
  }

  async postCompleteTask(resourceId) {
    try {
      await logDelay(
        `🃏 Task: Start task - ${resourceId}`,
        1000,
        this.account_name,
        "info"
      );
      const url = `${this.base_url}/friendly/growth-paas/mini-app-activity/third-party/task/complete`;

      const data = await this.fetch(url, "POST", this.access_token, {
        resourceIdList: [resourceId],
        referralCode: null,
      });

      if (data.code !== "000000" || !data.success) {
        throw new Error(`⚠️ Cannot complete task: ${data.message}`);
      }

      resolve(data.success);

      return data
    } catch (error) {
      throw new Error(`⚠️ Error completing task: ${error.message}`);
    }
  }

  //* ------------------------------------------------------------------------------ *//

  async autoPlayGame() {
    while (this.game_ticket > 0) {
      await delay(1000);
      if (await this.startGame()) {
        const {score, encryptedPayload} = getGameData(this.game_response)
        if (encryptedPayload) {
          await logDelay(
            `🎯 Game: Playing game in 45 seconds`,
            60000,
            this.account_name,
            "info"
          );
          if (await this.completeGame(encryptedPayload, score)) {
            this.game_ticket -= 1;
            await logDelay(
              `🎯 Game: Tickets remaining: ${this.game_ticket}/6`,
              1000,
              this.account_name,
              "warning"
            );
          } else {
            await logDelay(
              `🎯 Game: Cannot complete game`,
              1000,
              this.account_name,
              "error"
            );
          }
        } else {
          await logDelay(
            `🎯 Game: Cannot receive game data`,
            3000,
            this.account_name,
            "error"
          );
        }
      } else {
        await logDelay(
          `🎯 Game: Cannot start game`,
          1000,
          this.account_name,
          "error"
        );
      }
    }
  }

  async startGame() {
    try {
      const url = `${this.base_url}/friendly/growth-paas/mini-app-activity/third-party/game/start`;
      const gameResponse = await this.fetch(url, "POST", this.access_token, {
        resourceId: 2056,
      });

      this.game_response = gameResponse;

      if (gameResponse.code !== "000000") {
        await logDelay(
          `🎯 Game: Fail start game ${gameResponse.message}`,
          1000,
          this.account_name,
          "error"
        );
        return false;
      } else {
        await logDelay(
          `🎯 Game: Started game`,
          1000,
          this.account_name,
          "info"
        );

        // await identifyTrapItems(gameResponse.cryptoMinerConfig || {});
        return true;
      }
    } catch (error) {
      log(`🎯 Game: Error ${error.message}`, "error");
      return false;
    }
  }

  async gameData() {
    const url =
      "https://moonbix-server-9r08ifrt4-scriptvips-projects.vercel.app/moonbix/api/v1/play";
    const payload = { game_response: this.game_response };

    try {
      const response = await axios.get(url, {
        params: payload, // Menggunakan params untuk mengirimkan data query
        proxy: false, // Memeriksa apakah proxies diisi atau tidak
        timeout: 20000, // Timeout diatur ke 20 detik (20,000 ms)
      });

      const data = response.data;

      if (data.message === "success") {
        const point = data.game.log;
        this.game_data = data.game;

        await logDelay(
          `🎯 Game: Received points ${point}`,
          1000,
          this.account_name,
          "success"
        );
        return true;
      } else {
        await logDelay(
          `🎯 Game: Error receiving game data ${data.message}`,
          3000,
          this.account_name,
          "error"
        );
        return false;
      }
    } catch (error) {
      await logDelay(
        `🎯 Game: Error receiving game data ${error.message}`,
        3000,
        this.account_name,
        "error"
      );
      return false;
    }
  }

  async completeGame(payload, score) {
    try {
      const url = `${this.base_url}/friendly/growth-paas/mini-app-activity/third-party/game/complete`;
      const body = {
        resourceId: 2056,
        payload: payload,
        log: score
      }
      const data = await this.fetch(url, "POST", this.access_token, body);
  
      if (data.code === "000000" && data.success) {
        await logDelay(`🎯 Game: Completed game | Received ${score} points`, 1000, this.account_name, 'custom');
        return true;
      } else {
        await logDelay(`🎯 Game: Cannot complete game v2 ${data.message}`, 1000, this.account_name, 'error');
        return false;
      }
    } catch (error) {
      await logDelay(`🎯 Game: Error completing game ${error.message}`, 1000, this.account_name, 'error');
      return false
    }
  }

  async axiosCompleteGame(payload, point){
    const url = "https://www.binance.com/bapi/growth/v1/friendly/growth-paas/mini-app-activity/third-party/game/complete";
    
    const requestData = {
        resourceId: 2056,
        payload: payload,
        log: point,
    };

    const headers = {
        'X-Growth-Token': this.access_token,
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
        "Content-Type": "application/json",
        "Origin": "https://www.binance.com",
        "Referer": "https://www.binance.com/vi/game/tg/moon-bix",
        "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
        "Sec-Ch-Ua-Mobile": "?1",
        "Sec-Ch-Ua-Platform": '"Android"',
        "User-Agent": getRandomUserAgent(),
    };

    const axiosConfig = {
      headers: headers,
      timeout: 20000, // 20 seconds timeout
    };

    try {
      const response = await axios.post(url, requestData, axiosConfig);
      
      const status = response.data.success;
      return status;
    } catch (error) {
      console.error('Error occurred:', error.message);
      if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
          console.error('Response headers:', error.response.headers);
      } else if (error.request) {
          console.error('No response received:', error.request);
      } else {
          console.error('Error setting up the request:', error.message);
      }
    }
  }

  async retryApiCall(apiCall, retries = 3, delayTime = 1000, accountName = '') {
    let attempt = 0;
    
    while (attempt < retries) {
      try {
        return await apiCall();
      } catch (error) {
        if (error.includes('504') || error.includes('502')) {
          attempt++;
          await logDelay(
            `🤖 API call failed: ${error}, retrying... (${attempt}/${retries})`,
            delayTime,
            accountName,
            'error'
          );
          await delay(delayTime);
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`🤖 API call failed after ${retries} attempts.`);
  }
  
}
