let fcm = require('fcm-notification');

let firebase_config = {
    "type": process.env.TYPE,
    "project_id": process.env.PROJECT_ID,
    "private_key_id": process.env.PRIVATE_KEY_ID,
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCimM4YpmeJszs0\n0/6gFL8vLoqNm+k3vNXmLHkLIqBRZUeF8+3d3iukFDeYHUzbhUVuwxkZwjMTH2zT\nG5gEhvvzWa18WcwjgPjbCOpPn4bUvWenFNE+rNh0C+q01S8LMCc1z0N1PoFCMBMo\nSrQ+hMHXtBr4iQgjSgMY6TDe4uZW0GHkxtRpuw8GdQ0ylm67bMA2oM/WhCIkzWAk\n+BBdmjH7d+Lmg72ABrqCt/1R/Y9C1HScz4xxd6CV1mQXoBki+7XyZI1ybsRJ+U0m\n/PRgGvsKFb9BZUJSrmvGYH8MJQLxiFFNBluhpMFmtMPXLV7UxCCmEPSQHqPTlOW1\n1fibhHLrAgMBAAECggEABy+quDMuk0rtHHYcJFYWZw7vB7gy1AhQCdbAWMokfMR1\np0lzI2Gs2xkbpejxmygmO/F6fAV1vWwfoqrvCpAutYAqpzrOx2jtVrzroi5CRsfC\nO4Ozhcoc3PAj5O8hH6T2rq2k5RsomlTGm/rFQZgbex2WLZLc3bZpMaIoy0kK9h44\nk3988bMijAM4nPTxi9UGTfH6GjXHuuRFHxYWBalAEW36DNLchGqR5mqJG+P++DwV\nbJOiUFPlVjPPOljBWQVlGNp2WGNVQRpzg6/P0Edr2i57lvJIdwuBDclFzfZOWePj\n8RnVSg4Ivr5VW0GZPlH7VCwxv+FsvPcsosR5pxnl+QKBgQDQiu/6IiNrimssdMl+\nVmxqSsquvxGkTCKygbN+y48lLrnRx0xhLyBiWbL6yXzXV5B4vmmCfigQQdclcVxA\nSQSrQM5a/kEFwCKvIwFUk9W7sfG0Xz+LGiayWmv8pybP8vWfU8hGEN5knpMrc1Q0\nQ0yuypHXP1yLTSp33+WAGY3aAwKBgQDHmTQwkY/AMiCJcqueWectwQjP++0r/Ssv\ncLHYE/EARxqmPav+07K+xgltQvsNXVGJWuFXmQ2/mqVdqG6QFpLwKDDZVVFC8Osc\nkTB6GEI7F8TJT0+d6hfpY0PHzFi4K2fjg0WP8OgNyZUlh20eYOy3F2r4XWz5EhFf\n66vv590i+QKBgCQ/MezZCC0F9xDYD7mczeU/sLDk1u0mqpU6Q/eS7AN7dqLGsDjo\nFwnhK2G5qbBIMP07o10iDladCwcgB/fIeT5G2lcogCa+uYiVXgLUWz7vc+J097d2\nySkQ3Foit3VHdnfF+TZscistAMl5lzYqSGbNIMI36h7wP6RsTxiP2H7/AoGAQ6CQ\nA0i+ePNC/O8CYOO7JVB7KOUFxdrAkBFR4JFZHav5xousw+l8bZDxzrhcEXolzzEg\nmqp78wh1sRcJZv6PCJnFe02h+9le/83dq/CeOCFkhoS9yBZxxZzhcUe2Y6gpSffH\nUO7h4RIE27NX8GwMqDhiAQa+jmFly6cxGVbpIRkCgYEAzUSI8Z5OpIrOshl+eK07\n+L3melsVg1UUT/mWo+qPIayplAS5kBC0RagQv4l216aG8ZEkWZIzGjciTSloPyDA\nsxdG24DQflIpMEVdNS6db/9zsSbH6BEU94zsTVVBuXRZLlEtHJPYhmp1qNqPNKsP\nLNk22cBN/aqgWAJOVDCclGE=\n-----END PRIVATE KEY-----\n",
    "client_email": process.env.CLIENT_EMAIL,
    "client_id": process.env.CLIENT_ID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-dcm2f%40cyecom-af359.iam.gserviceaccount.com"
}

let FCM = new fcm(firebase_config);

async function sendFcm(body, tokens) {

    const message = {
        data: {
            sound: "notification.mp3",
            "target_id": `${body.target_id}`,
            "type": `${body.type}`
            // android_channel_id: "cyecomid"
        },

        notification: {
            title: body.title,
            body: body.message
        },
        android: {
            "priority": "high"
        },
    };

    // FCM.sendToMultipleToken(message, tokens, function (err, response) {
    //     console.log(err, response);
    //     cb(err, response)
    // });

    FCM.sendToMultipleToken(message, tokens, function (err, response) {
        if (err) {
            console.log('err--', err);
        } else {
            console.log('response-----', response);
        }

    })

    return;
}

module.exports.send_fcm = sendFcm;
