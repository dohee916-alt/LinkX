// All conversation messages use this single reusable, content-driven bubble.
export function messageBubble(message){
 const bubble=document.createElement("div");
 bubble.className="lx-bubble";
 const text=document.createElement("span");
 text.className="lx-bubble-text";
 text.textContent=message.text;
 bubble.append(text);
 return bubble;
}
