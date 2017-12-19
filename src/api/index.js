import { version } from '../../package.json';
import { Router } from 'express';
import facets from './facets';
import Gdax from 'gdax';
import axios from 'axios';
import _ from 'lodash';
import {strategy} from '../lib/util';
const KrakenClient = require('kraken-node-api');

export default ({ config, db }) => {
	let api = Router();
	const COINBASE_API_KEY = "d";
	const COINBASE_API_SECRET = "d";
	const GDAX_API_KEY = "";
	const GDAX_API_SECRET = "";
	var authedClient = new Gdax.AuthenticatedClient(
  GDAX_API_KEY, GDAX_API_SECRET, 'dinerosuerte');
	const publicClient = new Gdax.PublicClient();

	// mount the facets resource
	api.use('/facets', facets({ config, db }));

	// perhaps expose some API metadata at the root
	api.get('/', (req, res) => {
		res.json({ version });
	});

	api.get('/getAccounts', (req, res) => {
		var gdaxAccounts = [];
		var account = {};
		authedClient.getAccounts(function(error, response, data) {
			res.send(data);
		});
	});

	api.get('/getHistoricalData', (req, res) => {
		publicClient.getProductHistoricRates({'start': '2017-12-13T01:27:17.000Z', 'end': '2017-12-13T01:30:17.000Z', 'granularity': 60}, function(error, response, data) {
			res.send(data);
		});
	});

	var btcPrice = function getBtcPrice() {
		const publicClient = new Gdax.PublicClient();
		return publicClient.getProductTicker()
	}

	var ltcPrice = function getLtcPrice() {
		const publicClient = new Gdax.PublicClient('LTC-USD');
		return publicClient.getProductTicker()
	}

	var ethPrice = function getEthPrice() {
		const publicClient = new Gdax.PublicClient('ETH-USD');
		return publicClient.getProductTicker()
	}

	var ltcBtc = function getltcBtcPrice() {
		const publicClient = new Gdax.PublicClient('LTC-BTC');
		return publicClient.getProductTicker()
	}

	var ethBtc = function getethBtcPrice() {
		const publicClient = new Gdax.PublicClient('ETH-BTC');
		return publicClient.getProductTicker()
	}

	api.get('/gdaxPrices', (req, res) => {
		Promise.all([btcPrice(), ltcPrice(), ethPrice(), ltcBtc(), ethBtc()]).then(values => {
			var btc = values[0]["price"];
			var ltc = values[1]["price"];
			var eth = values[2]["price"];
			var ltcBtc = values[3]["price"];
			var ethBtc = values[4]["price"];
			res.json({btc: btc, ltc: ltc, eth: eth, ltcBtc: ltcBtc, ethBtc: ethBtc});
		})
	});

	api.get('/binancePrices', (req, res) => {
			axios.get('https://api.binance.com/api/v1/ticker/allPrices').then(data => {
				var btc = _.find(data.data, {'symbol': 'BTCUSDT'});
				var ltcBtc = _.find(data.data, {'symbol': 'LTCBTC'});
				var eth = _.find(data.data, {'symbol': 'ETHUSDT'});
				var ltcEth = _.find(data.data, {'symbol': 'LTCETH'});
				res.json({btc: btc.price, ltcBtc: ltcBtc.price, eth: eth.price, ltcEth: ltcEth.price});
			});
		});

	api.get('/krakenPrices', (req, res) => {
		const key = "";
		const secret = "";
		const kraken = new KrakenClient();

		(async () => {
	    var btc = await kraken.api('Ticker', { pair : 'XXBTZUSD' });
			var ltc = await kraken.api('Ticker', { pair: 'XLTCZUSD'});
			var eth = await kraken.api('Ticker', {pair: 'XETHZUSD'});
			res.json({
				btc: btc.result.XXBTZUSD.a[0],
				ltc: ltc.result.XLTCZUSD.a[0],
				eth: eth.result.XETHZUSD.a[0]
			})
		})();
	});

	async function getGeminiPrices() {
		const btc = await axios.get('https://api.gemini.com/v1/pubticker/btcusd');
		const eth = await axios.get('https://api.gemini.com/v1/pubticker/ethusd');
		return {btc: btc.data.ask, eth: eth.data.ask};
	}

	api.get('/geminiPrices', (req, res) => {
		(async () => {
			res.json(await getGeminiPrices());
		})();
	});

	return api;
}
