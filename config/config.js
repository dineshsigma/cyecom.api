const Pool = require('pg-pool');

let config = {
    "secret": process.env.AUTH_SECRET,
    "otp-secret": process.env.AUTH_OTP,
    "authorization": process.env.AUTH_KEY || 'Basic ZWxhc3RpYzo1WGJ6aW1uemlndnQ1YzRyVkZLeVNBcTY=' ,
    "private": process.env.TOKEN_KEY || "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAj1uME3GPIIJ4lxn376uAr+R0POt8NSuzuV2bknzTCa/HdO7FKu/YVOY1\nh2geHb2oLelObNhZFLG0XD38h1Hevzrs3rks5uMYUVchjNcbxuQZgINMu6EqgxkqtklegBxp\nLS0TEGGDpCYk2BQsrEXqluU+Ndx7LYqiwsrLDCFUV2J+NWnsgNuLqswt/tDuKHKyR1NK8TKK\nRzyN15oJ2TO+IVxZpXMZ3vj972nVAJREjYTPBAfEnEIhn1/mwcYat7Je0YnNAEHZ3UTcJyRh\nGfp5InHJwexFXrapU8vCZeNtsQypuB/G/Ovx6jGrfkLd7LfXC4LQQHXnjAuDwCf3Pin6JwID\nAQABAoIBAGiI/BrNiu3M1fxw/j+xUrRwJWaq3La0+Ggp3yCxjv4YRJx65CGMJba667uia5uK\nSdG4t+xc0pBpiLhepv9R7tiJMmKyqxBt9rSRkbBuxx2ABSyWEeUb/7D7MA8ebx+CGBvOK4Gd\nae3Ptrwt8elpTkfcQEHsVZH+7vKWB/v/bc4Nt65BzsWhlBsFvRq6pjyXub3UNlS/LKmDSIxk\nQOE1HCrAfJzaWZkkchLZc+otT5G0iJQe/inn7fFFRpjpIJ9zT7LMtsrsLWHJC3a6DJFnPmi5\nAWE0g9VRzxjP2iJ8EafJuds8LBGaGm91+69zzsR5812eD80hM8YAOR03Y56nCKkCgYEAxaHA\n8F9JVAVu/1eMn9QhRE8P4cWaF9WRoi/0leKJGExrOEymy1IZfqUCK6y2lWcjawc1L5Kwa21w\nYDU4vqO691HTKnGKa3R8kYyC28aRuJl3ANBBq208YVwBensrRfkEc8zrByG+Q4nqfvip6CUd\nFoREiSbqLC4AjkudUAJLnwsCgYEAubJPPwqlrinqXhYISaQLdMk/CIxnADcueBkUToxx7raB\nh0U6xiaWqJcyx5G1vqA43p6BmyUPaWcxTa3r8tmEkWp3P8trvgYCinLU+NmSwwKYPTxEU9rP\nK109MnB4CFQMmC4lPrgS6aGBq5cRql6OvMfh6YI5gRl2ys6Hd3+bstUCgYEAqkS85JtDoub3\nhXhZSI5Lhv2S0lIbe3NeAFzOnZ/Ju6yDJ8MqZLu8CVeCsjwgJkHwytIv6We5JSTpj4nq9Jw9\nhbzycHvX5NI8TG3BhDXk8CUP2RyTp2z6e2r4Px0E4Ek1o8slpkRVFv0okfIM+FuZXv/fyEZF\ntICBrBbLVtZTbpcCgYAE3XQQDcJbdsOqJV+gNkkKjT82hR8ptUhlYxrSGAHgJC3uklTA3j/y\nOMveyKV/UglLY9G3c9gchdSX2WemHCbJ/IUVScoP1253nBySTHj43PeKGysbG090LmQtDx9F\n8JXH4uWc6AuuzUltam7PDN0mewIjMQM6q6UeGR0Zd2Fn5QKBgCAh1XJyhEto2lKRMzuQtCuV\nRdClzz59lhIuwBY4z1Jlqy0sTtCpgrE5ojueu+5Zq2lvkylAmt7vAPOlnFdjU0uOgKDJ/BuS\ntFlrJ6DBwGegU7/JGZlrmmSXTcbSr5T3y59nBYEaTRzAqcYMfptMB5+VXgBSjsQyWB3JXpHN\n+H8z\n-----END RSA PRIVATE KEY-----\n",
    "hasuradb": process.env.DEPLOY_STAGE == "stage" ? {
        // hasuraurl:'http://182.156.148.26:8085/v1/graphql'
        hasuraurl: process.env.HASURA_URL_STAGE
        //myhasuraadminsecretkeyofe2enetwoksbd
    } : {
        hasuraurl: process.env.HASURA_URL_DEV
        //myadminsecretkeymyadminsecretkeymyadminsecretkey
    },

    "dbconnection": process.env.DEPLOY_STAGE == "stage" ? {
        user: process.env.POSTGRES_USER_STAGE,
        host: process.env.POSTGRES_HOST_STAGE,
        database: process.env.POSTGRES_DB_STAGE,
        password: process.env.POSTGRES_PASSWORD_STAGE,
        port: process.env.POSTGRES_PORT_STAGE,
        ssl: false,
        max: 500, // set pool max size to 500
        idleTimeoutMillis: 3000, // close idle clients after 3 second
        connectionTimeoutMillis: 20000, // return an error after 20 second if connection could not be established
        maxUses: 7500,

    } : {
        user: process.env.POSTGRES_USER_DEV,
        host: process.env.POSTGRES_HOST_DEV,
        database: process.env.POSTGRES_DB_DEV,
        password: process.env.POSTGRES_PASSWORD_DEV,
        port: process.env.POSTGRES_PORT_DEV,
        ssl: false,
        max: 500, // set pool max size to 500
        idleTimeoutMillis: 3000, // close idle clients after 3 second
        connectionTimeoutMillis: 20000, // return an error after 20 second if connection could not be established
        maxUses: 7500,

    },
    "domainurl": process.env.DEPLOY_STAGE == "stage" ? process.env.API_URL_STAGE : process.env.API_URL_DEV,
    "baseurl": process.env.S3_BUCKET_URL || 'https://happimobiles.s3.ap-south-1.amazonaws.com/test-images-v1/',
    "url": process.env.DEPLOY_STAGE == "stage" ?  process.env.UI_URL_STAGE : process.env.UI_URL_DEV,
    "access": ["me", "me+childs", "organization"],

    /////AWS KEYS--------------->
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,

}

//console.log("config", config)
//console.log("AUTH_SECRET:", secret); 

const pool = new Pool(config.dbconnection)

module.exports.config = config;
module.exports.pool = pool;
