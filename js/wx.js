const APP_ID = "wxa5dd5e0f961ab4b7";
const APP_SECRET = "c8a2e2e5247f683dfaf7c47c734b5c16";

let JSAPI_TICKET = getCookie("ticket");
let NONCESTR = getCookie("noncestr");
let TIMESTAMP = getCookie("timestamp");

// Workflow

function main() {
    if (!JSAPI_TICKET) {
        getAccessToken(APP_ID, APP_SECRET);
    } else {
    }
}

function getAccessToken(appid, secret) {
    load({
        url: ` https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`,
        callback: parseAccessToken,
        json: true,
    });
}

function parseAccessToken(response) {
    let accessToken = response.access_token;
    getJsapiTicket(accessToken);
}

function getJsapiTicket(accessToken) {
    load({
        url: `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`,
        callback: parseJsapiTicket,
        json: true,
    });
}

function parseJsapiTicket(jsapiTicket) {
    let { errcode, ticket, expires } = jsapiTicket;
    if (parseInt(errcode) != 0) return jsapiTicket;
    setCookie("ticket", ticket, expires);
    JSAPI_TICKET = ticket;
    main();
}

function signature() {
    setCookie("ticket", ticket, expires);
}

// Basics

function load(obj) {
    let loader = new XMLHttpRequest();
    loader.onreadystatechange = () => {
        if (loader.readyState == 4 && loader.status == 200) {
            let response = loader.responseText;
            if (obj.json) {
                response = JSON.parse(response);
            }
            if (obj.hasOwnProperty("callback")) {
                obj.callback(response);
            } else {
                return response;
            }
        }
    };
    loader.open(short(obj.method, "GET"), obj.url, true);
    loader.send();
}

function short() {
    for (argument of arguments) if (argument) return argument;
}

function setCookie(name, value, expires) {
    document.cookie = `${name}=${value};expires=${expires}`;
}

function getCookie(name) {
    name = name + "=";
    let c,
        ca = document.cookie.split(";");
    for (var i = 0; i < ca.length; i++) {
        c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return null;
}

// Call

wx.config({
    debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
    appId: "wxa5dd5e0f961ab4b7", // 必填，公众号的唯一标识
    timestamp: 1594914017, // 必填，生成签名的时间戳
    nonceStr: "", // 必填，生成签名的随机串
    signature: "", // 必填，签名
    jsApiList: ["updateTimelineShareData"], // 必填，需要使用的JS接口列表
});
wx.ready(function () {
    //需在用户可能点击分享按钮前就先调用
    wx.updateTimelineShareData({
        title: "", // 分享标题
        link: "", // 分享链接，该链接域名或路径必须与当前页面对应的公众号JS安全域名一致
        imgUrl: "", // 分享图标
        success: function () {
            // 设置成功
        },
    });
});

main();
