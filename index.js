const fs = require("fs");
const path = require("path");
const url = require("url");
const https = require("https");
const StringDecoder = require("string_decoder").StringDecoder;

const moment = require("moment");
var XLSX = require("xlsx");

const getExchangeRates = (base = "INR", callback) => {
  const exchangeURL = `https://api.exchangeratesapi.io/latest?base=${base}&symbols=INR,USD,EUR,GBP,AUD,CNY`;
  const parsedURL = url.parse(exchangeURL);

  https
    .request(parsedURL, res => {
      const decoder = new StringDecoder("utf-8");
      let buffer = "";
      res.on("data", data => {
        buffer += decoder.write(data);
      });
      res.on("end", () => {
        buffer += decoder.end();

        const { rates } = JSON.parse(buffer);
        callback(false, rates);
      });
    })
    .end();
};

const extractAmount = str => {
  const currencyType = str.split(" ")[1];
  const amount = Number(str.split(" ")[0]);
  return [amount, currencyType];
};

const readJSON = () => {
  const file = path.join(__dirname, ".data", "data.json");
  const JSONData = JSON.parse(fs.readFileSync(file, "utf8"));
  return JSONData;
};

const readXLSX = fileName => {
  const filePath = path.join(__dirname, ".data", fileName + ".xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet_name_list = workbook.SheetNames;
  const xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
  return xlData;
};

const getReport = options => {
  const { parser, fileName, amountField, dateField, dateFormat } = options;
  const parsedData = parser(fileName);

  getExchangeRates("INR", (err, rates) => {
    if (!err) {
      const months = moment.months();
      const allData = {};

      parsedData.forEach(data => {
        const [amount, currency] = extractAmount(data[amountField]);
        const month = months[moment(data[dateField], dateFormat).get("month")];
        const year = moment(data[dateField], dateFormat).get("year");

        let previousAmount = 0;
        if (allData[year]) {
          if (allData[year][month]) {
            previousAmount = Number(allData[year][month]);
          }
        }

        allData[year] = {
          ...allData[year],
          [month]: (previousAmount + amount / rates[currency]).toFixed()
        };
      });

      console.log(allData);
    } else {
      console.log("error fetching the exchange rates");
    }
  });
};

getReport({
  parser: readXLSX,
  fileName: "overdues",
  amountField: "amount",
  dateField: "dueDate",
  dateFormat: "DD-MM-YYYY"
});
