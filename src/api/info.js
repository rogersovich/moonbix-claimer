import { API } from "./api.js";
import { logDelay } from "../config/helpers.js";

export class Moonbix extends API {
  constructor(name, query, proxy) {
    super()

    this.proxy = proxy;
    this.query = query
    this.account_name = name
    this.access_token = null
    this.account_info = null
    this.current_session = null
    this.game_response = null
    this.game_data = null
    this.game_ticket = null
    this.game_traps = []
    this.game_refresh_ticket = {
      message: null,
      time: 0
    }
    this.base_url = 'https://www.binance.com/bapi/growth/v1'
  }

  async getAccessToken() {
    return new Promise(async (resolve, reject) => {
      try {
        await logDelay(`🗝️ Auth: Try to Login`, 1000, this.account_name, 'info');
        const accessTokenUrl = `${this.base_url}/friendly/growth-paas/third-party/access/accessToken`;
       
        const data = await this.fetch(
          accessTokenUrl,
          "POST",
          null,
          { queryString: this.query, socialType: 'telegram' }
        );

        if(data.ok === false) {
          throw new Error(`🤖 Failed to get access token: ${data.statusText}`);
        }
    
        if (data.code !== '000000' || !data.success) {
          throw new Error(`🤖 Failed to get access token: ${data.message}`);
        }

        //* Get access token from the data
        const accessToken = data.data.accessToken;

        this.access_token = accessToken
        
        resolve();
      } catch (error) {
        reject(`🤖 API call failed: ${error}`);
      }
    });
  }

  async getUserInfo() {
    return new Promise(async (resolve, reject) => {
      try {

        await logDelay(`🗝️ Auth: Get user info`, 1000, this.account_name, 'info');
        const userInfoUrl = `${this.base_url}/friendly/growth-paas/mini-app-activity/third-party/user/user-info`;
       
        const data = await this.fetch(
          userInfoUrl,
          "POST",
          this.access_token,
          { resourceId: 2056 }
        );

        if (data.code !== '000000' || !data.success) {
          throw new Error(`🤖 Failed to get user info: ${data.message}`);
        }

        this.account_info = data.data

        const metaInfo = data.data.metaInfo
        const availableTickets = (metaInfo.totalAttempts || 0) - (metaInfo. consumedAttempts || 0)
        const refreshTicket = metaInfo.attemptRefreshCountDownTime || 0
        const attemptTime =  refreshTicket + (480000 * 5)
        const formatRefreshTicket = refreshTicket != 0 ? this.formatTimeFromNow(attemptTime) : "N/A"

        this.game_refresh_ticket = {
          message: formatRefreshTicket,
          time: attemptTime
        }
        this.game_ticket = availableTickets

        await logDelay(`🪙 Balance: ${metaInfo.totalGrade}`, 500, this.account_name, 'success');
        await logDelay(`🃏 Tickets Available: ${availableTickets}`, 500, this.account_name, 'success');
        await logDelay(`🃏 Tickets Refresh: ${formatRefreshTicket}`, 500, this.account_name, 'success');
        
        resolve();
      } catch (error) {
        reject(`🤖 API call failed: ${error}`);
      }
    });
  }

  formatTimeFromNow(milliseconds) {
    const now = new Date().getTime();
    const futureTime = new Date(now + milliseconds);
  
    const diffInSeconds = Math.floor((futureTime - now) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
  
    if (diffInMinutes < 1) {
      return `${diffInSeconds} seconds again`;
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes again`;
    } else {
      return `${diffInHours} hours again`;
    }
  }
}
