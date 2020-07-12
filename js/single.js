let dict = {};
let past = new Set();

function load() {
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            parse(JSON.parse(xmlhttp.responseText));
        }
    };
    xmlhttp.open(
        "GET",
        "https://raw.githubusercontent.com/pwxcoo/chinese-xinhua/master/data/idiom.json",
        true
    );
    xmlhttp.send();
}

function parse(data) {
    let word;
    for (item of data) {
        word = item["word"].replace("，", "").replace(" ", "");
        dict[word] = {
            word,
            pinyin: item["pinyin"].split(" "),
            explanation: item["explanation"],
        };
    }
    start(data);
}

function start(data) {
    let index = Math.floor(Math.random() * data.length);
    vm.setWord(dict[data[index]["word"]]);
}

let vm = new Vue({
    el: "#game",
    data: {
        word: "安之若素",
        pinyin: ["an", "zhi", "ruo", "su"],
        explanation: "",
        input: "",
        timer: null,
        time: 30,
        setTime: 30,
        score: -1,
        msg: "欢迎",
    },
    created: function () {
        this.timer = setInterval(this.interval, 1000);
    },
    computed: {
        pairs: function () {
            let wordPairs = [];
            for (i in this.word) {
                wordPairs.push({
                    char: this.word[i],
                    pinyin: this.pinyin[i],
                });
            }
            return wordPairs;
        },
    },
    methods: {
        check() {
            let word = this.input.replace("，", "").replace(",", "").replace(" ", "");
            if (!(word = dict[word])) {
                this.msg = "不是成语";
                alert(this.msg);
            } else if (
                word.word[0] != this.word[this.word.length - 1] &&
                word.pinyin[0] != this.pinyin[this.pinyin.length - 1]
            ) {
                this.msg = "首尾文字或读音不同";
                alert(this.msg);
            } else if (past.has(word.word)) {
                this.msg = "已经使用过了";
                alert(this.msg);
            } else {
                this.setWord(word);
            }
            return false;
        },
        setWord(item) {
            this.word = item.word;
            this.pinyin = item.pinyin;
            this.explanation = item.explanation;
            this.input = "";
            past.add(item.word);
            this.time = this.setTime;
            this.score++;
        },
        interval() {
            if (--this.time <= 0) {
                clearInterval(this.timer);
                alert(`您的得分为：${this.score}！`);
                location.reload();
            }
            console.log(`剩余时间：${this.time}`);
        },
    },
});

load();
