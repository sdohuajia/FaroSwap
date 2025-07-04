import Web3 from 'web3';
import fs from 'fs/promises';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

class Faroswap {
  constructor() {
    this.RPC_URL = "https://testnet.dplabs-internal.com";
    this.PHRS_CONTRACT_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    this.WPHRS_CONTRACT_ADDRESS = "0x3019B247381c850ab53Dc0EE53bCe7A07Ea9155f";
    this.USDC_CONTRACT_ADDRESS = "0x72df0bcd7276f2dFbAc900D1CE63c272C4BCcCED";
    this.USDT_CONTRACT_ADDRESS = "0xD4071393f8716661958F766DF660033b3d35fD29";
    this.WETH_CONTRACT_ADDRESS = "0x4E28826d32F1C398DED160DC16Ac6873357d048f";
    this.WBTC_CONTRACT_ADDRESS = "0x8275c526d1bCEc59a31d673929d3cE8d108fF5c7";
    this.MIXSWAP_ROUTER_ADDRESS = "0x3541423f25A1Ca5C98fdBCf478405d3f0aaD1164";
    this.POOL_ROUTER_ADDRESS = "0xf05Af5E9dC3b1dd3ad0C087BD80D7391283775e0";
    this.tickers = [
      "PHRS", "WPHRS", "USDC", "USDT", "WETH", "WBTC"
    ];
    this.ERC20_CONTRACT_ABI = [
      {"type":"function","name":"balanceOf","stateMutability":"view","inputs":[{"name":"address","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
      {"type":"function","name":"allowance","stateMutability":"view","inputs":[{"name":"owner","type":"address"},{"name":"spender","type":"address"}],"outputs":[{"name":"","type":"uint256"}]},
      {"type":"function","name":"approve","stateMutability":"nonpayable","inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"outputs":[{"name":"","type":"bool"}]},
      {"type":"function","name":"decimals","stateMutability":"view","inputs":[],"outputs":[{"name":"","type":"uint8"}]},
      {"type":"function","name":"deposit","stateMutability":"payable","inputs":[],"outputs":[]},
      {"type":"function","name":"withdraw","stateMutability":"nonpayable","inputs":[{"name":"wad","type":"uint256"}],"outputs":[]}
    ];
    this.UNISWAP_V2_CONTRACT_ABI = [
      {   
        "type": "function",
        "name": "getAmountsOut",
        "stateMutability": "view",
        "inputs": [
          { "internalType": "uint256", "name": "amountIn", "type": "uint256" },
          { "internalType": "address[]", "name": "path", "type": "address[]" },
          { "internalType": "uint256[]", "name": "fees", "type": "uint256[]" }
        ],
        "outputs": [
          { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
        ]
      },
      {
        "type":"function",
        "name":"addLiquidity",
        "stateMutability":"nonpayable",
        "inputs":[
          { "internalType": "address", "name": "tokenA", "type": "address" },
          { "internalType": "address", "name": "tokenB", "type": "address" },
          { "internalType": "uint256", "name": "fee", "type": "uint256" },
          { "internalType": "uint256", "name": "amountADesired", "type": "uint256" },
          { "internalType": "uint256", "name": "amountBDesired", "type": "uint256" },
          { "internalType": "uint256", "name": "amountAMin", "type": "uint256" },
          { "internalType": "uint256", "name": "amountBMin", "type": "uint256" },
          { "internalType": "address", "name": "to", "type": "address" },
          { "internalType": "uint256", "name": "deadline", "type": "uint256" }
        ],
        "outputs":[
          { "internalType": "uint256", "name": "amountA", "type": "uint256" },
          { "internalType": "uint256", "name": "amountB", "type": "uint256" },
          { "internalType": "uint256", "name": "liquidity", "type": "uint256" }
        ]
      }
    ];
    // 参数区
    this.deposit_amount = 0.01;
    this.withdraw_amount = 0.01;
    this.swap_count = 1;
    this.phrs_swap_amount = 0.01;
    this.wphrs_swap_amount = 0.01;
    this.usdc_swap_amount = 0.01;
    this.usdt_swap_amount = 0.01;
    this.weth_swap_amount = 0.01;
    this.wbtc_swap_amount = 0.01;
    this.add_lp_count = 1;
    this.wphrs_add_lp_amount = 0.01;
    this.usdc_add_lp_amount = 0.01;
    this.usdt_add_lp_amount = 0.01;
    this.weth_add_lp_amount = 0.01;
    this.wbtc_add_lp_amount = 0.01;
    this.min_delay = 2;
    this.max_delay = 2;
  }

  log(msg) {
    const now = new Date().toLocaleString('zh-CN', { hour12: false });
    console.log(`${chalk.cyan(`[${now}]`)} ${chalk.white(msg)}`);
  }

  maskAccount(account) {
    if (!account) return null;
    return account.slice(0, 6) + '******' + account.slice(-6);
  }

  async sleep(sec) {
    return new Promise(r => setTimeout(r, sec * 1000));
  }

  async performDeposit(web3, privKey, address) {
    this.log(chalk.green('充值功能开始...'));
    try {
      const balance = await web3.eth.getBalance(address);
      this.log(`${chalk.cyan('     余额 :')} ${chalk.white(Web3.utils.fromWei(balance, 'ether'))} PHRS`);
      this.log(`${chalk.cyan('     金额 :')} ${chalk.white(this.deposit_amount)} PHRS`);
      if (parseFloat(Web3.utils.fromWei(balance, 'ether')) < this.deposit_amount) {
        this.log(`${chalk.cyan('     状态 :')}${chalk.yellow(' PHRS 余额不足')}`);
        return;
      }
      const contract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, this.WPHRS_CONTRACT_ADDRESS);
      const data = contract.methods.deposit().encodeABI();
      const value = Web3.utils.toWei(this.deposit_amount.toString(), 'ether');
      const gas = await contract.methods.deposit().estimateGas({ from: address, value });
      const gasLimit = Math.ceil(Number(gas) * 1.2).toString();
      const nonce = (await web3.eth.getTransactionCount(address, 'pending')).toString();
      const chainId = (await web3.eth.getChainId()).toString();
      const tx = {
        from: address,
        to: this.WPHRS_CONTRACT_ADDRESS,
        value: value.toString(),
        data,
        gas: gasLimit,
        maxPriorityFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
        maxFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
        nonce,
        chainId
      };
      const signed = await web3.eth.accounts.signTransaction(tx, privKey);
      const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
      this.log(`${chalk.cyan('     状态  :')}${chalk.green(' 充值成功 ')}`);
      this.log(`${chalk.cyan('     区块  :')}${chalk.white(receipt.blockNumber)}`);
      this.log(`${chalk.cyan('     哈希  :')}${chalk.white(receipt.transactionHash)}`);
      this.log(`${chalk.cyan('     浏览器:')}${chalk.white(`https://testnet.pharosscan.xyz/tx/${receipt.transactionHash}`)}`);
    } catch (e) {
      this.log(`${chalk.cyan('     状态  :')}${chalk.red(' 充值失败 ')}${e}`);
    }
    await this.sleep(this.min_delay);
  }

  async performWithdraw(web3, privKey, address) {
    this.log(chalk.green('提现功能开始...'));
    try {
      const contract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, this.WPHRS_CONTRACT_ADDRESS);
      const decimals = Number(await contract.methods.decimals().call());
      const balance = await contract.methods.balanceOf(address).call();
      const balanceNum = Number(balance) / Math.pow(10, decimals);
      this.log(`${chalk.cyan('     余额 :')} ${chalk.white(balanceNum)} WPHRS`);
      this.log(`${chalk.cyan('     金额 :')} ${chalk.white(this.withdraw_amount)} WPHRS`);
      if (balanceNum < this.withdraw_amount) {
        this.log(`${chalk.cyan('     状态 :')}${chalk.yellow(' WPHRS 余额不足')}`);
        return;
      }
      const amount = Web3.utils.toWei(this.withdraw_amount.toString(), 'ether');
      const data = contract.methods.withdraw(amount).encodeABI();
      const gas = await contract.methods.withdraw(amount).estimateGas({ from: address });
      const gasLimit = Math.ceil(Number(gas) * 1.2).toString();
      const nonce = (await web3.eth.getTransactionCount(address, 'pending')).toString();
      const chainId = (await web3.eth.getChainId()).toString();
      const tx = {
        from: address,
        to: this.WPHRS_CONTRACT_ADDRESS,
        data,
        gas: gasLimit,
        maxPriorityFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
        maxFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
        nonce,
        chainId
      };
      const signed = await web3.eth.accounts.signTransaction(tx, privKey);
      const receipt = await web3.eth.sendSignedTransaction(signed.rawTransaction);
      this.log(`${chalk.cyan('     状态  :')}${chalk.green(' 提现成功 ')}`);
      this.log(`${chalk.cyan('     区块  :')}${chalk.white(receipt.blockNumber)}`);
      this.log(`${chalk.cyan('     哈希  :')}${chalk.white(receipt.transactionHash)}`);
      this.log(`${chalk.cyan('     浏览器:')}${chalk.white(`https://testnet.pharosscan.xyz/tx/${receipt.transactionHash}`)}`);
    } catch (e) {
      this.log(`${chalk.cyan('     状态  :')}${chalk.red(' 提现失败 ')}${e}`);
    }
    await this.sleep(this.min_delay);
  }

  async performSwap(web3, privKey, address) {
    this.log(chalk.green('兑换功能开始...'));
    const from_token = this.PHRS_CONTRACT_ADDRESS;
    const to_token = this.USDC_CONTRACT_ADDRESS;
    const amount = this.phrs_swap_amount;
    try {
      if (from_token !== this.PHRS_CONTRACT_ADDRESS) {
        const contract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, from_token);
        const decimals = Number(await contract.methods.decimals().call());
        const approveAmount = BigInt((amount * Math.pow(10, decimals)).toString());
        const allowance = BigInt(await contract.methods.allowance(address, this.MIXSWAP_ROUTER_ADDRESS).call());
        if (allowance < approveAmount) {
          const approveData = contract.methods.approve(this.MIXSWAP_ROUTER_ADDRESS, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').encodeABI();
          const gas = await contract.methods.approve(this.MIXSWAP_ROUTER_ADDRESS, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').estimateGas({ from: address });
          const gasLimit = Math.ceil(Number(gas) * 1.2).toString();
          const nonce = (await web3.eth.getTransactionCount(address, 'pending')).toString();
          const chainId = (await web3.eth.getChainId()).toString();
          const tx = {
            from: address,
            to: from_token,
            data: approveData,
            gas: gasLimit,
            maxPriorityFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
            maxFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
            nonce,
            chainId
          };
          const signed = await web3.eth.accounts.signTransaction(tx, privKey);
          await web3.eth.sendSignedTransaction(signed.rawTransaction);
          this.log(`${chalk.cyan('     状态  :')}${chalk.green(' Approve 成功 ')}`);
        }
      }
      this.log(`${chalk.yellow('     兑换功能请根据实际 DODO 路由 API 实现 calldata、to、value、gasLimit')}`);
    } catch (e) {
      this.log(`${chalk.cyan('     状态  :')}${chalk.red(' 兑换失败 ')}${e}`);
    }
    await this.sleep(this.min_delay);
  }

  async performAddLiquidity(web3, privKey, address) {
    this.log(chalk.green('添加流动性功能开始...'));
    const from_token = this.WPHRS_CONTRACT_ADDRESS;
    const to_token = this.USDC_CONTRACT_ADDRESS;
    const amount = this.wphrs_add_lp_amount;
    try {
      for (const token of [from_token, to_token]) {
        if (token !== this.PHRS_CONTRACT_ADDRESS) {
          const contract = new web3.eth.Contract(this.ERC20_CONTRACT_ABI, token);
          const decimals = Number(await contract.methods.decimals().call());
          const approveAmount = BigInt((amount * Math.pow(10, decimals)).toString());
          const allowance = BigInt(await contract.methods.allowance(address, this.POOL_ROUTER_ADDRESS).call());
          if (allowance < approveAmount) {
            const approveData = contract.methods.approve(this.POOL_ROUTER_ADDRESS, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').encodeABI();
            const gas = await contract.methods.approve(this.POOL_ROUTER_ADDRESS, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff').estimateGas({ from: address });
            const gasLimit = Math.ceil(Number(gas) * 1.2).toString();
            const nonce = (await web3.eth.getTransactionCount(address, 'pending')).toString();
            const chainId = (await web3.eth.getChainId()).toString();
            const tx = {
              from: address,
              to: token,
              data: approveData,
              gas: gasLimit,
              maxPriorityFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
              maxFeePerGas: Web3.utils.toWei('1', 'gwei').toString(),
              nonce,
              chainId
            };
            const signed = await web3.eth.accounts.signTransaction(tx, privKey);
            await web3.eth.sendSignedTransaction(signed.rawTransaction);
            this.log(`${chalk.cyan('     状态  :')}${chalk.green(' Approve 成功 ')}`);
          }
        }
      }
      this.log(`${chalk.yellow('     添加流动性功能请根据实际合约 ABI 实现参数')}`);
    } catch (e) {
      this.log(`${chalk.cyan('     状态  :')}${chalk.red(' 添加流动性失败 ')}${e}`);
    }
    await this.sleep(this.min_delay);
  }

  async main() {
    const accounts = (await fs.readFile('accounts.txt', 'utf-8')).split('\n').map(line => line.trim()).filter(Boolean);
    let proxies = [];
    try {
      proxies = (await fs.readFile('proxy.txt', 'utf-8')).split('\n').map(line => line.trim());
    } catch {}
    this.log('Faroswap 自动机器人');
    this.log('Rey? <水印>');
    this.log('账户总数: ' + chalk.white(accounts.length));
    for (let i = 0; i < accounts.length; i++) {
      const privKey = accounts[i];
      if (!privKey) continue;
      let proxy = proxies[i] && proxies[i].length > 0 ? proxies[i] : null;
      const web3 = proxy ? new Web3(new Web3.providers.HttpProvider(this.RPC_URL, proxy.startsWith('socks') ? { agent: new SocksProxyAgent(proxy) } : { agent: proxy })) : new Web3(this.RPC_URL);
      let address;
      try {
        address = web3.eth.accounts.privateKeyToAccount(privKey).address;
      } catch {
        this.log(chalk.red('私钥无效: ' + privKey));
        continue;
      }
      this.log(chalk.cyan('处理账户: ') + chalk.white(this.maskAccount(address)) + (proxy ? chalk.yellow(' [代理]') : chalk.gray(' [直连]')));
      await this.performDeposit(web3, privKey, address);
      await this.performWithdraw(web3, privKey, address);
      await this.performSwap(web3, privKey, address);
      await this.performAddLiquidity(web3, privKey, address);
    }
  }
}

const bot = new Faroswap();

(async () => {
  while (true) {
    await bot.main();
    // 24小时倒计时
    let seconds = 24 * 60 * 60;
    while (seconds > 0) {
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      process.stdout.write(`\r${chalk.cyan('[等待下轮执行]')} 剩余时间: ${chalk.yellow(`${h}:${m}:${s}`)}`);
      await new Promise(r => setTimeout(r, 1000));
      seconds--;
    }
    process.stdout.write('\n');
  }
})(); 
