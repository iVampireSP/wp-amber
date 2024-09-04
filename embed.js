class LeaflowAmber {
    processing = false
    synced = false

    assistant_name = "助理"
    message_cleared = "消息记录已经清除。"

    error_message = "发送消息的时候出了点问题，要不试试 /reset 来重置一下？"
    after_reset_message = "已重置会话。"

    button_css = "leaflow-amber-show-chat-button"

    role_human = "user"
    role_hide_human = "user_hide"
    role_assistant = "assistant"
    role_system = "system"
    role_hide_system = "system_hide"

    last_selected_text = ""

    buffer = ""
    buffer_delay = 50


    constructor(config) {
        if (config.assistant_name) {
            this.assistant_name = config.assistant_name
        }

        if (config.welcome_message) {
            this.welcome_message = config.welcome_message
        }

        if (config.button_css) {
            this.button_css = config.button_css
        }
    }

    amberContainer() {
        return document.querySelector('#leaflow-amber-chat')
    }
    hideChatButton() {
        return document.querySelector("#leaflow-amber-hide-chat")
    }

    chatContainer() {
        return document.querySelector("#leaflow-amber-chat-container")
    }
    showChatButton() {
        return document.querySelector("#leaflow-amber-show-chat")
    }
    chatMessageContainer() {
        return document.querySelector("#leaflow-amber-chat-messages")
    }
    sendButton() {
        return document.querySelector("#leaflow-amber-send-button")
    }
    clearButton() {
        return document.querySelector("#leaflow-amber-clear-button")
    }
    input() {
        return document.querySelector("#leaflow-amber-message-input")
    }
    callingState() {
        return document.querySelector("#leaflow-amber-calling")
    }

    setCalling(name, success = true) {
        if (!name) {
            this.callingState().innerHTML = ""
        } else {
            if (!success) {
                this.callingState().innerHTML = "无法调用此工具"
            } else {
                this.callingState().innerHTML = "正在调用 " + name
            }
        }
    }

    init() {
        // const cssContainer = document.createElement("style")
        // cssContainer.innerHTML = this.base_css
        // document.head.appendChild(cssContainer)

        const baseContainer = document.createElement("div")
        baseContainer.innerHTML = this.getHtml()
        document.body.appendChild(baseContainer)

        const showChatButton = this.showChatButton();
        const hideChatButton = this.hideChatButton();
        const sendButton = this.sendButton();
        // const clearButton = this.clearButton()
        const input = this.input();

        // set name
        if (this.assistant_name) {
            this.changeTitle(this.assistant_name, false)
        }


        sendButton.addEventListener("click", () => {
            this.sendMessage()
        });

        input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                this.sendMessage()
            }
        });

        if (this.welcome_message !== "") {
            this.addAssistantMessage(this.welcome_message)
        }


        // 监听显示按钮点击事件
        showChatButton.addEventListener('click', () => {
            this.getChatId()
            this.syncMessage()
            this.show()
        });

        // 监听关闭按钮点击事件
        hideChatButton.addEventListener('click', () => {
            this.hide()
        });

        // 清除按钮
        // clearButton.addEventListener("click", () => {
        //     this.clearMessage()
        // })

        // 监听用户选择的文字
        document.addEventListener('selectionchange', () => {
            const selectedText = window.getSelection().toString();
            if (selectedText) {
                this.last_selected_text = selectedText
            }
        });
    }

    toggleChatVisibility() {
        const amberContainer = this.amberContainer()

        if (amberContainer.style.display === 'none') {
            this.show()
        } else {
            this.hide()
        }
    }

    show() {
        const amberContainer = this.amberContainer()
        const showChatButton = this.showChatButton()
        // amberContainer.style.display = 'flex';
        // showChatButton.style.display = 'none';
        showChatButton.style.transform = 'scale(0)';


        // 设置 amberContainer 的 transform scale 为 0
        amberContainer.style.transform = 'scale(1)';
        amberContainer.style.opacity = '0.95';

        const postId = this.getPostId()

        if (postId && this.continueIfPostIsNotAnswered()) {
            this.sendMessage(this.role_human, "解读文章(PostId:"+postId+")")
        }
    }

    hide() {
        const amberContainer = this.amberContainer()
        const showChatButton = this.showChatButton()

        // 设置 amberContainer 的 transform scale 为 0
        amberContainer.style.transform = 'scale(0)';
        amberContainer.style.opacity = '0';

        // showChatButton.style.display = 'flex';
        // 设置 showChatButton 的 transform scale 为 1
        showChatButton.style.transform = 'scale(1)';

    }

    isOpen() {
        // return this.amberContainer().style.display === 'flex'
        // 检查 scale 是否为 1
        return this.amberContainer().style.transform === 'scale(1)'
    }

    amberConfig() {
        return {
            server_url: "/wp-content/plugins/amber/stream.php"
        }
    }

    lastAssistantMessage() {
        const chatMessageContainer = this.chatMessageContainer();
        let lastMessage = "";
        let messageElement = chatMessageContainer.lastElementChild;

        // 确保 class 是 leaflow-amber-chat-bubble-wrapper-left
        if (messageElement && messageElement.classList.contains("leaflow-amber-chat-bubble-wrapper-left")) {
            lastMessage = messageElement.querySelector(".leaflow-amber-chat-content").innerText
        }

        return lastMessage
    }

    async sendMessage(role, message_override) {
        if (this.processing) {
            return
        }

        let message = this.input().value
        let messageRole = role
        let addMessage = true
        if  (!role) {
            messageRole = this.role_human
        }
        if (messageRole === this.role_hide_system || messageRole === this.role_system
            || messageRole === this.role_hide_human
        ) {
            addMessage = false
        }

        if (!message_override) {
            if (message === "") {
                return
            }

            this.input().value = ""
        } else {
            message = message_override
        }

        if (message === "/reload") {
            window.location.reload()
            return
        } else if (message === "/clear") {
            this.clearMessage();
            return
        } else if (message === "/reset") {
            // 清除 localStorage
            let needClear = ['leaflow_amber_chat_id']

            for (let i = 0; i < needClear.length; i++) {
                localStorage.removeItem(needClear[i])
            }


            if (this.after_reset_message && this.after_reset_message !== "") {
                this.addAssistantMessage(this.after_reset_message)
            }

            this.chat_id = undefined;

            this.getChatId();
            return
        }

        const chatContainer = this.chatContainer()
        // 检测滚动条是否在 chatMessageContainer 最底下，如果在，则滚动
        if (chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        this.setRandomColor()
        this.setSpeed(10)

        fetch(this.amberConfig().server_url + "/chat_public/" + await this.getChatId() + '/messages', {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                role: messageRole
            })
        }).then(res => {
            res.json().then(data => {
                if (data.success) {
                    this.processing = true

                    if (addMessage) {
                        this.addHumanMessage(message, true)
                    }

                    this.stream(data.data.stream_id)

                    return data.data.stream_id

                } else {
                    if (res.status === 409) {
                        if (addMessage) {
                            this.addHumanMessage(message, true)
                        }

                        this.input().value = ""

                        this.stream(data.data.stream_id)

                        return data.data.stream_id
                    } else {
                        this.processing = false
                        // 如果状态码是 404，则跳过
                        if (data.status === 404 || data.status === 403) {
                            return
                        }

                        console.error(data)
                        alert(data.error)


                        if (this.error_message && this.error_message !== "") {
                            this.addAssistantMessage(this.error_message)
                        }
                    }

                    return ""
                }
            }).catch(err => {
                this.processing = false
                // 如果状态码是 404，则跳过
                if (data.status === 404 || data.status === 403) {
                    return
                }
                console.error(err)
                alert("发送失败")
            })
        })

    }


    async stream(stream_id) {
        if (stream_id === "" || stream_id === undefined) {
            console.error("stream_id is required")
            return
        }

        const url = this.amberConfig().server_url + "/stream/" + stream_id;

        const evtSource = new EventSource(url);

        let messageElement

        const chatContainer = this.chatContainer()


        let added = false

        let setup = false

        evtSource.addEventListener("data", (e) => {
            // 检测滚动条是否在 chatMessageContainer 最底下，如果在，则滚动
            if (chatContainer.scrollTop + chatContainer.clientHeight >= chatContainer.scrollHeight) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            if (e.data === "[DONE]") {
                this.processing = false
                evtSource.close();

                return;
            }

            const data = JSON.parse(e.data);
            switch (data.state) {
                case "tool_calling":
                    const function_name = this.spiltFunctionName(data.tool_call_message.function_name)
                    this.setCalling(data.tool_call_message.tool_name + " 中的 " + function_name)
                    const args = data.tool_call_message.args

                    const special_tool = {
                        'change_title': () => {
                            // 玩玩你的标题
                            this.changeTitle(args.title)
                        },
                        'close': () => {
                            const closeInt = setInterval(() => {
                                if (!this.processing) {
                                    document.write(`<h3>${this.lastAssistantMessage()}</h3>`)
                                    clearInterval(closeInt)
                                }
                            }, 1000)
                        },
                        'hide': () => {
                            const hideInt = setInterval(() => {
                                if (!this.processing) {
                                    this.hide()
                                    clearInterval(hideInt)
                                }
                            }, 1000)
                        },
                        'show': () => {
                            this.show()
                        },
                        'get_current_post_id': () => {
                            // 如果用户正在首页 /
                            if (window.location.pathname === '/') {
                                this.sendMessageWhileDone(this.role_hide_human, "[Event]用户当前在首页")
                                return
                            }
                            let post_id = this.getPostId();

                            if (post_id) {
                                this.sendMessageWhileDone(this.role_hide_human, `[Event]用户当前正在查看的 PostID 是 ${post_id}`)
                            } else {
                                this.sendMessageWhileDone(this.role_hide_human, "[Event]用户查看的不是文章/页面")
                            }
                        },
                        'get_selected_text': () => {
                            let text = '';
                            if (window.getSelection) {
                                text = window.getSelection().toString()
                            } else if (document.selection) {
                                text = document.selection.createRange().text
                            }

                            if (text === '') {
                                text = this.last_selected_text;
                            }

                            if (text !== '') {
                                this.sendMessageWhileDone(this.role_hide_human, `[Event]用户选中的文本是:  ${text}`)
                            } else {
                                this.sendMessageWhileDone(this.role_hide_human, "[Event]用户没有选中任何文本")
                            }
                        }
                    };

                    // 如果是 特殊工具，则执行特殊工具
                    if (special_tool[function_name]) {
                        special_tool[function_name]()
                        this.setCalling();
                        return
                    }

                    break;
                case "tool_response":
                    setTimeout(() => {
                        this.setCalling()
                    }, 300);
                    break;
                case "tool_failed":

                    this.setCalling(data.tool_response_message.tool_name + " 中的 " + data.tool_response_message.function_name, false)

                    setTimeout(() => {
                        this.setCalling()
                    }, 300);
                    break;
                case "chunk":
                    if (!added) {
                        messageElement = this.addAssistantMessage()
                        added = true
                    }

                    this.buffer += data.content

                    if (!setup) {
                        this.setupBufferInsert(messageElement)
                        setup = true
                    }

                    chatContainer.scrollTop = chatContainer.scrollHeight;

                    break;
            }
        });


    }

    setupBufferInsert(messageElement) {
        let content = ""
        let i = 0
        let hangTime = 0
        let added = false
        let classAdded = false
        let hasContent = false

        const chatContainer = this.chatContainer()
        const sendButton = this.sendButton()


        let buffer_timer = setInterval(() => {
            if (added && !classAdded) {
                this.setRandomColor()
                // 添加 leaflow-amber-gradient css 到 amberContainer
                // amberContainer.classList.add("leaflow-amber-gradient")
                classAdded = true
                // set button disabled
                sendButton.setAttribute("disabled", "disabled")
                sendButton.innerHTML = "请稍后"
            }

            // 获取 this.buffer 长度，每次只增加 1 个字符
            let length = this.buffer.length;
            if (i < length) {
                // 如果 length - i < 10，则每次增加 1 个字符，否则每次增加 10 个字符
                if (length - i < 10) {
                    content += this.buffer[i]
                    i++
                } else {
                    content += this.buffer.slice(i, i + 10)
                    i += 10
                }

                hasContent = true
            } else {
                // 检测是否处理完成
                if (!this.processing) {
                    // 处理完成
                    messageElement.innerHTML = markdown.toHTML(this.buffer);
                    clearInterval(buffer_timer)
                    this.buffer = ""

                    this.setSpeed(1)
                    this.setTransparent()

                    sendButton.removeAttribute("disabled")
                    sendButton.innerHTML = "发送"


                } else if (hangTime > 1000) {
                    // 如果超过 1 秒
                    this.setSpeed(5)
                    // 你也可以自定义函数在这里，但是可能要注意防抖
                } else {
                    // 如果没有处理完成，则继续等待
                    hangTime += this.buffer_delay
                }

                hasContent = false
            }

           if (hasContent) {
               if (!added) {
                   added = true
               }

               // 恢复
               hangTime = 0
               // 设置 amberContainer 的 --animate-speed
               this.setSpeed()

               // 检测是否有 navigator.vibrate
               if (navigator.vibrate) {
                   navigator.vibrate(1)
               }

               chatContainer.scrollTop = chatContainer.scrollHeight;

               messageElement.innerHTML = markdown.toHTML(content);
           }
        }, this.buffer_delay)
    }

    setSpeed(s) {
        if (!s) {
            s = 1
        }

        this.amberContainer().style.setProperty("--animate-speed", s + "s")
    }
    setRandomColor() {
        // use rgb
        function random() {
            let r = Math.floor(Math.random() * 256)
            let g = Math.floor(Math.random() * 256)
            let b = Math.floor(Math.random() * 256)
            return `rgb(${r}, ${g}, ${b})`
        }

        // --liner-gradient-1, 9
        const amberContainer = this.amberContainer()
        for (let i = 1; i <= 9; i++) {
            amberContainer.style.setProperty(`--liner-gradient-${i}`, random())
        }
        amberContainer.style.setProperty(`--after-opacity`, '1')
    }

    // 设置透明颜色
    setTransparent() {
        const amberContainer = this.amberContainer()
        // for (let i = 1; i <= 9; i++) {
        //     amberContainer.style.setProperty(`--liner-gradient-${i}`, 'rgba(0,0,0,0)')
        // }
        amberContainer.style.setProperty(`--after-opacity`, '0')

    }

    sendMessageWhileDone(role, message) {
        const r = setInterval(() => {
            if (!this.processing) {
                this.sendMessage(role, message)
                clearInterval(r)
            }
        });
    }


    async getChatId() {
        const key = "leaflow_amber_chat_id"

        let chat_id = localStorage.getItem(key)

        if (!chat_id || chat_id === "undefined") {

            const name = new Date().toLocaleDateString() + ' 时 的对话'

            const r = {
                "name": name
            }


            await fetch(this.amberConfig().server_url + "/chat_public", {
                method: "POST",
                body: JSON.stringify(r),
                headers: {
                    "Content-Type": "application/json"
                }
            }).then(res => {
                res.json().then(data => {
                    if (data.success) {
                        chat_id = data.data.id
                        localStorage.setItem(key, chat_id);
                        this.chat_id = chat_id;

                        return chat_id
                    } else {
                        // 如果状态码是 404，则跳过
                        if (data.status === 404 || data.status === 403) {
                            return
                        }
                        console.error(data)
                        alert(data.error)
                        return null
                    }
                })
            })
        }

        return chat_id;
    }
    async syncMessage() {
        if (!this.chat_id) {
            let chat_id = await this.getChatId()
            if (!chat_id) {
                return
            }

            this.chat_id = chat_id
        }

        if (this.synced) {
            return
        }

        this.setCalling("同步消息")


        fetch(this.amberConfig().server_url + "/chat_public/" + await this.getChatId() + '/messages', {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        }).then(res => {
            // if 403
            if (res.status === 403 || res.status === 404) {
                this.setCalling("正在重置会话")
                // 清除 localStorage
                let needClear = ['leaflow_amber_chat_id', ]

                for (let i = 0; i < needClear.length; i++) {
                    localStorage.removeItem(needClear[i])
                }


                if (this.after_reset_message && this.after_reset_message !== "") {
                    this.addAssistantMessage(this.after_reset_message)
                }

                this.chat_id = undefined;

                this.getChatId();
                this.setCalling()

                return
            }

            res.json().then(data => {
                if (data.success) {
                    data.data.forEach(item => {
                        if (item.role === "user") {
                            this.addHumanMessage(item.content, true)
                        } else if (item.role === 'assistant') {
                            this.addAssistantMessage(item.content, true)
                        }
                    });

                    this.synced = true

                    this.chatContainer().scrollTop = this.chatContainer().scrollHeight;

                } else {
                    // 如果状态码是 404，则跳过
                    if (data.status === 404 || data.status === 403) {
                        return
                    }

                    console.error(data)
                    alert(data.error)
                }
            })
        }).finally(() => {
            this.setCalling()

        })
    }

    async clearMessage() {
        this.setCalling("清除消息")
        fetch(this.amberConfig().server_url + "/chat_public/" + await this.getChatId() + '/clear', {
            method: "POST",
            body: JSON.stringify({}),
            headers: {
                "Content-Type": "application/json"
            }
        }).then(() => {
            if (this.message_cleared && this.message_cleared !== "") {
                this.addAssistantMessage(this.message_cleared)
            }

            this.clearLocalMessages()
        }).catch(() => {
            // 如果状态码是 404，则跳过
            if (data.status === 404 || data.status === 403) {
                return
            }
            console.error(data)
            alert(data.error)
        }).finally(() => {
            this.setCalling()
        })
    }

    clearLocalMessages() {
        this.chatMessageContainer().innerHTML = ""
    }

    addAssistantMessage(content = "", renderMarkdown = false) {
        if (renderMarkdown) {
            content = markdown.toHTML(content)
        }

        const html = `<div class="leaflow-amber-chat-bubble leaflow-amber-chat-bubble-left"><div class="leaflow-amber-chat-content">${content}</div></div>`

        const element = document.createElement("div")
        element.classList.add("leaflow-amber-chat-bubble-wrapper-left")
        element.innerHTML += html
        this.chatMessageContainer().appendChild(element)
        return element.querySelector('.leaflow-amber-chat-content')
    }

    addHumanMessage(content = "", renderMarkdown = false) {
        if (renderMarkdown) {
            content = markdown.toHTML(content)
        }
        const html = `<div class="leaflow-amber-chat-bubble leaflow-amber-chat-bubble-right"><div class="leaflow-amber-chat-content">${content}</div></div>`
        const element = document.createElement("div")
        element.classList.add("leaflow-amber-chat-bubble-wrapper-right")
        element.innerHTML += html
        this.chatMessageContainer().appendChild(element)
        return element.querySelector('.leaflow-amber-chat-content')
    }

    getPostId() {
        // 获取 attr 为 data-amber-post-id 的 div
        let postId = document.querySelector('[data-amber-post-id]')

        if (postId == null) {
            return null
        }

        return postId.getAttribute('data-amber-post-id');
    }

    continueIfPostIsNotAnswered() {
        const postId = this.getPostId()
        if (postId == null) {
            return false
        }

        let answered = document.querySelector('[data-amber-post-id-' + postId + '-answered]')

        if (answered == null) {
            return false
        }

        // get attr, if false, mark it true
        if (answered.getAttribute('data-amber-post-id-' + postId + '-answered') === 'false') {
            answered.setAttribute('data-amber-post-id-' + postId + '-answered', 'true')
            return true
        }

        return false
    }

    changeTitle(title, animate = true) {
        if (title == null || title === "") {
            title = this.assistant_name;
        }
        this.assistant_name = title;

        const element = document.querySelector("#leaflow-amber-assistant-name");

        if (animate) {
            let newText = "";
            let originColor = element.style.color;

            // 淡出旧文本
            element.style.color = "transparent";
            setTimeout(() => {
                element.style.color = originColor

                // 逐字显示新文本
                let index = 0;
                const intervalId = setInterval(() => {
                    if (index < title.length) {
                        newText += title.charAt(index);
                        element.innerHTML = newText;
                        index++;
                    } else {
                        clearInterval(intervalId);
                    }
                }, 100);
            }, 600);
        } else {
            element.innerHTML = title;
        }
    }



    spiltFunctionName(function_name) {
        // 根据 _ 分割
        let function_names = function_name.split("_");
        // 从第 1 个开始取到最后一个
        return function_names.slice(1).join("_");
    }

    getHtml() {
        return `
<button id="leaflow-amber-show-chat" class="${this.button_css}"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat-dots" viewBox="0 0 16 16">
  <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
  <path d="m2.165 15.803.02-.004c1.83-.363 2.948-.842 3.468-1.105A9 9 0 0 0 8 15c4.418 0 8-3.134 8-7s-3.582-7-8-7-8 3.134-8 7c0 1.76.743 3.37 1.97 4.6a10.4 10.4 0 0 1-.524 2.318l-.003.011a11 11 0 0 1-.244.637c-.079.186.074.394.273.362a22 22 0 0 0 .693-.125m.8-3.108a1 1 0 0 0-.287-.801C1.618 10.83 1 9.468 1 8c0-3.192 3.004-6 7-6s7 2.808 7 6-3.004 6-7 6a8 8 0 0 1-2.088-.272 1 1 0 0 0-.711.074c-.387.196-1.24.57-2.634.893a11 11 0 0 0 .398-2"/>
</svg></button>
    <div id="leaflow-amber-chat">
        <div class="leaflow-amber-chat-container" id="leaflow-amber-chat-container">
            <div class="leaflow-amber-header">
                <div class="leaflow-amber-header-title">
                    <h2 id="leaflow-amber-assistant-name"></h2>
                </div>
                <button class="leaflow-amber-header-close" id="leaflow-amber-hide-chat"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
  <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
</svg></button>
            </div>
            <div id="leaflow-amber-chat-messages">
                
               
            </div>
            <div>
                <small id="leaflow-amber-calling"></small>
            </div>
            <div class="leaflow-amber-input-container">
                <input type="text" id="leaflow-amber-message-input" placeholder="输入消息...">
                <button id="leaflow-amber-send-button">发送</button>
            </div>
            <div class="leaflow-amber-footer">
                <small>Powered by <a href="https://amber.leaflow.cn" target="_blank">Leaflow Amber</a></small>
            </div>
        </div>
    </div>`
    }
}
