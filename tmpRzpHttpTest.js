const https = require("https");
const creds = Buffer.from(
  `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`,
).toString("base64");
const options = {
  hostname: "api.razorpay.com",
  path: "/v1/orders",
  method: "POST",
  headers: {
    Authorization: `Basic ${creds}`,
    "Content-Type": "application/json",
  },
};
const req = https.request(options, (res) => {
  console.log("statusCode=", res.statusCode);
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log(data);
  });
});
req.on("error", (e) => console.error("error", e));
req.write(
  JSON.stringify({ amount: 100, currency: "INR", receipt: "test_rcpt" }),
);
req.end();
