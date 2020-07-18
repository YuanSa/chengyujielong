# 成语接龙

你可以在这里试玩本成语接龙：[元卅馆](http://yuansasi.com/lab/chengyujielong)

本游戏使用了 [pwxcoo/chinese-xinhua](https://github.com/pwxcoo/chinese-xinhua) GitHub 库，并对此库内容进行了一些修正（如错误注音、标点符号等）。

## 算法

1. 将成语全部加载，load 进 map 中。
1. 随机选取一个成语加载，并开启游戏。
1. 用户提交输入后，对输入 trim，判断是否首尾文字、拼音相同。若相同则判断是否已经使用过。若未使用过，则加入 set、加分并重置倒计时。
1. 倒计时结束后游戏结束。

### Hack

由于 alert 有阻塞效果，可以利用 alert 暂停倒计时。

## 备注

囿于带宽限制，本游戏使用云对象存储保存成语数据文件，并没有使用库中的文件。
