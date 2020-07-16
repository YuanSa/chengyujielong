let dict = {};
let past = new Set();

let vm = new Vue({
    el: "#game",
    data: {
        word: "正在加载",
        pinyin: ["zhèng", "zài", "jiā", "zǎi"],
        explanation: "",
        input: "",
        timer: null,
        time: 0,
        setTime: 300,
        score: 0,
        run: false,
        loader: null,
    },
    created: function () {
        this.load();
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
        load() {
            this.loader = new XMLHttpRequest();
            this.loader.onreadystatechange = () => {
                if (this.loader.readyState == 4 && this.loader.status == 200) {
                    this.parse(JSON.parse(this.loader.responseText));
                }
            };
            this.loader.open("GET", "data/idiom.json", true);
            this.loader.send();
        },
        parse(data) {
            let word;
            for (item of data) {
                word = item["word"].replace("，", "").replace(" ", "");
                dict[word] = {
                    word,
                    pinyin: item["pinyin"].split(" "),
                    explanation: item["explanation"],
                };
            }
            this.start(data);
        },
        start(data) {
            let index = Math.floor(Math.random() * data.length);
            this.run = true;
            this.time = this.setTime;
            this.setWord(dict[data[index]["word"]]);
            this.timer = setInterval(this.interval, 1000);
        },
        interval() {
            if (--this.time <= 0) {
                clearInterval(this.timer);
                alert(`您的得分为：${this.score}！`);
                location.reload();
            }
            console.log(`剩余时间：${this.time}`);
        },
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
                this.addScore();
            }
            return false;
        },
        setWord(item) {
            this.word = item.word;
            this.pinyin = item.pinyin;
            this.explanation = item.explanation;
            this.input = "";
            past.add(item.word);
        },
        addScore() {
            this.score += Math.round((this.time * 100) / this.setTime);
            this.time = this.setTime;
        },
    },
});
