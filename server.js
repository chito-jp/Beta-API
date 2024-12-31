/*
エンドポイント一覧
/data : 今まで取得したIDのデータを返す
/api/id/名前 : ID取得
/api/auth/名前 : /認証レベル(1桁)/警告(1桁)/id(5桁)g
/api/profile/取得する相手の名前?name=自分の名前 : プレイヤーの情報取得
/api/ranking/ランキングタイプ番号?name=自分の名前 : ランキング取得

---ランキングタイプ番号一覧---
40line : 0
20line : 1
marathon : 2
ultra : 3
rate : 4
level : 5
apm : 6
pps : 7
playTiime : 8
follower : 9
-------------------
*/
import Mist from "@turbowarp/mist";
import express from "express";
import fs from "fs";

const Beta=class{
  constructor(userAgent){
    this.data=JSON.parse(fs.readFileSync("data.json"));
    this.random=fs.readFileSync("random.txt");
    this.keys=JSON.parse(fs.readFileSync("key.json"));
    this.connected=false;
    this.req={code:new Map(),resolve:new Map(),timeout:new Map(),interval:new Map()};
    
    this.ws=new Mist({projectId:"1000009994",userAgent:userAgent||"chito-bot"});
    this.ws.on("set",(n,v)=>{
      const res={code:Number(`${v[0]}${v[1]}${v[2]}`)};
      if(499<res.code&&res.code<600){
        res.id=Number(v[3]);
        res.UNN_length=Number(`${v[4]}${v[5]}`)-10;
        res.UNN=v.slice(6,6+res.UNN_length);
        res.data=v.slice(6+res.UNN_length,v.length);
        for(const [req_id,req_code] of this.req.code.entries()){
          if(req_code.startsWith(`${res.code-400}${res.id}${res.UNN_length+10}${res.UNN}`)){
            const resolve=this.req.resolve.get(req_id);
            if(resolve)resolve(res.data);
            this.cleanupRequest(req_id);
            break;
          }
        }
      }else if(599<res.code&&res.code<800){
        res.playerId=v.slice(3,8);
        res.address=v.slice(8,11);
        res.id=v[11];
        res.data=v.slice(12,v.length);
        for(const [req_id,req_code] of this.req.code.entries()){
          if(req_code.startsWith(`${res.code-400}${res.playerId}${res.address}${res.id}`)){
            const resolve=this.req.resolve.get(req_id);
            if(resolve)resolve(res.data);
            this.cleanupRequest(req_id);
            break;
          }
        }
      }
    });
    this.ws.on("connected",()=>{
      this.connected=true;
      console.log("WebSocket connected!");
    });
    this.ws.on("disconnected", () => {
      this.connected = false;
      console.log("WebSocket disconnected.");
    });
  }
  toNum(str){
    let [char,ret]=["0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_‡ ",""];
    for(let i=0;i<str.length;i++) ret+=char.indexOf(str[i])+11;
    return ret;
  }
  toStr(num){
    let [char,ret]=["0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_‡ ",""];
    for(let i=0;i<num.length/2;i++) ret+=char[Number(num[i*2]+num[i*2+1])-11];
    return ret;
  }
  getData(){
    return this.data;
  }
  cleanupRequest(req_id) {
    this.req.code.delete(req_id);
    this.req.resolve.delete(req_id);
    clearTimeout(this.req.timeout.get(req_id));
    this.req.timeout.delete(req_id);
    clearInterval(this.req.interval.get(req_id));
    this.req.interval.delete(req_id);
  }
  async sendRequest(req_code){
    return new Promise((resolve, reject)=>{
      const req_id=`${Date.now()}${Math.random()}`;
      this.req.code.set(req_id, req_code);
      this.req.resolve.set(req_id, resolve);
      const sendInterval = setInterval(() => {
        if (this.connected) {
          this.ws.set(String(Math.floor(Math.random() * 9)), req_code);
          console.log("Request sent:", req_code);
        } else {
          clearInterval(sendInterval);
          reject(new Error("WebSocket not connected"));
        }
      }, 500);
      this.req.interval.set(req_id,sendInterval)
      const timeout = setTimeout(() => {
        if (this.req.code.has(req_id)) {
          console.error("Request timed out:", req_id);
          this.cleanupRequest(req_id);
          clearInterval(sendInterval);
          resolve("Error : Request timed out");
        }
      }, 15000);
      this.req.timeout.set(req_id, timeout);
    });
  }
  async getAuth(name){
    const UNN=this.toNum(name);
    const req_code=`1040${UNN.length+10}${UNN}`;
    return await this.sendRequest(req_code);
  }
  async getId(name){
    if(this.data?.[name]){console.log("JSONファイルから取得したよ～");return this.data[name].id;}
    const auth=await this.getAuth(name);
    if(!auth)return null;
    const id=String(auth).slice(2,auth.length);
    console.log(id);
    this.data[name]={id};
    fs.writeFileSync("data.json", JSON.stringify(this.data));
    return id;
  }
  async getRanking(type,name,session){
    const id=await this.getId(name);
    const req_code=`251${id}9990${session || 10000}${type}`
    return await this.sendRequest(req_code);
  }
    timeFormat(time){
    let ret="";
    let _=String(time);
    for(let i=0;i<5-String(time).length;i++)_="0"+_;
    for(let i=4;i>=0;i--){
      ret=_[i]+ret;
      if(ret.length==2)ret="."+ret;
      if(ret.length==5)ret=":"+ret;
    }
    return ret;
  }
  timeFormat2(time){
    const times=[Math.floor(time/60),Math.floor(time%60),Math.round((time%1)*100)];
    let ret="";
    for(let i=0;i<3;i++)if(i<1){
      if(0<times[0])ret=times[i]+":";
    }else{
      if(String(times[i]).length<2)ret+=`0${times[i]}${":."[i] || ""}`;else ret+=`${times[i]}${":."[i] || ""}`;
    }
    return ret;
  }
  sortRanking(data,type){
    let i=0;
    let ret=[]
    while((i+1)<data.length){
      const UNN_length=Number(`${data[i]}${data[i+1]}`)-10;
      const UNN=data.slice(i+2,i+UNN_length+2);
      i+=UNN_length+3;
      let dt=(Number(data.slice(i-1,i+9))-1000000000)/100;
      if(type==0 || type==1)dt=this.timeFormat2(dt);
      if(type==8)if(((dt/60)>=10)){dt=Math.floor(dt/60)}else{dt=Math.floor((dt/60)*10)/10}
      ret.push({name:this.toStr(UNN),data:dt});
      i+=9;
    }
    return ret;
  }
  config(raw,index){
    return {
      BGM_volume:Number(raw.slice(index,index+3))-100,
      SE_volume:Number(raw.slice(index+3,index+6))-100,
      DAS:Math.round(0.05*(Number(raw.slice(index+6,index+9))-100)),
      ARR:Math.round(0.1*(Number(raw.slice(index+9,index+12))-100)),
      SDF:Math.round(0.2*(Number(raw.slice(index+12,index+15))-100)),
      Input_buffering:raw[index+15],
      Bonus_effect:raw[index+16],
      Ghost_transparency:Number(raw.slice(index+17,index+20))-100,
      Screen_Shake:Number(raw.slice(index+20,index+23))-100,
      HardDrop_effect:raw[index+23],
      grid:raw[index+24],
      skin:Number(raw.slice(index+26,index+28))-10,
      keyconfig:{
        type:raw[index+25],
        HardDrop:this.keys[Number(raw.slice(index+120,index+122))-11],
        SoftDrop:this.keys[Number(raw.slice(index+122,index+124))-11],
        Move_Left:this.keys[Number(raw.slice(index+124,index+126))-11],
        Move_Rignt:this.keys[Number(raw.slice(index+126,index+128))-11],
        Rotation_Left:this.keys[Number(raw.slice(index+128,index+130))-11],
        Rotation_Right:this.keys[Number(raw.slice(index+130,index+132))-11],
        Hold:this.keys[Number(raw.slice(index+132,index+134))-11],
        Zone:this.keys[Number(raw.slice(index+134,index+136))-11],
        Reset:this.keys[Number(raw.slice(index+136,index+138))-11],
      }
    }
  }
  profile(raw,index,option){
    index=index || 0;
    let play_time=Number(raw.slice(index+46,index+53))-1000000;
    if(((play_time/60)>=10)){play_time=Math.floor(play_time/60)}else{play_time=Math.floor((play_time/60)*10)/10}
    return {
      name:option?.name,
      id:option?.id,
      "登録日(unix)":raw.slice(index,index+10),
      coin:Number(raw.slice(index+31,index+39))-10000000,
      follower:Number(raw.slice(index+39,index+46))-1000000,
      play_time,
      achievements:raw.slice(index+53,index+103),
      level:raw.slice(index+103,index+110)-1000000,
      neo:{
        rate:Number(raw.slice(index+10,index+16))-100000,
        ranking:Number(raw.slice(index+16,index+23))-1000000,
        rank:"DCBASUX"[Number(raw[index+30])],
        apm:(Number(raw.slice(index+23,index+27))-1000)/10,
        pps:(Number(raw.slice(index+27,index+30))-100)/100
      },
      "40line":{
        "?":Number(raw.slice(index+260,index+270))-1000000000,
        time:api.timeFormat(Number(raw.slice(index+270,index+279))-100000000),
        apm:(Number(raw.slice(index+279,index+284))-10000)/10,
        pps:(Number(raw.slice(index+284,index+288))-1000)/100,
        rank:Number(raw.slice(index+288,index+294))-100000
      },
      "20line":{
        "?":Number(raw.slice(index+294,index+304))-1000000000,
        time:api.timeFormat(Number(raw.slice(index+304,index+313))-100000000),
        apm:(Number(raw.slice(index+313,index+318))-10000)/10,
        pps:(Number(raw.slice(index+318,index+322))-1000)/100,
        rank:Number(raw.slice(index+322,index+328))-100000,
      },
      Marathon:{
        "?":Number(raw.slice(index+328,index+338))-1000000000,
        score:Number(raw.slice(index+338,index+347))-100000000,
        apm:(Number(raw.slice(index+347,index+352))-10000)/10,
        pps:(Number(raw.slice(index+352,index+356))-1000)/100,
        rank:Number(raw.slice(index+356,index+362))-100000,
      },
      Ultra:{
        "?":Number(raw.slice(index+362,index+372))-1000000000,
        score:Number(raw.slice(index+372,index+381))-100000000,
        apm:(Number(raw.slice(index+381,index+386))-10000)/10,
        pps:(Number(raw.slice(index+386,index+390))-1000)/100,
        rank:Number(raw.slice(index+390,index+396))-100000
      },
      config:this.config(raw,646),
    }
  }
  async getProfile(name,session){
    const id=await this.getId(name);
    const req_code=`254${id}999${Math.floor(Math.random()*9)}${session || 10000}${this.toNum(name)}`;
    return {raw:await this.sendRequest(req_code),id}
  }
}

const app=express();
const allowCrossDomain = (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Headers", "*");
  next();
};
app.use(allowCrossDomain);

const api=new Beta("chito-bot");

app.get("/",(req,res)=>{
  res.sendStatus(200);
});

app.get("/api/auth/:name",async(req,res)=>{
  const {name}=req.params;
  const data=await api.getAuth(name);
  res.json({name,data});
});

app.get("/api/id/:name",async(req,res)=>{
  const {name}=req.params;
  const data=await api.getId(name);
  res.json({name,data});
});

app.get("/api/ranking/:type",async(req,res)=>{
  const {type}=req.params;
  const raw=await api.getRanking(type,req.query.name,req.query?.session);
  res.json({data:api.sortRanking(raw,type),raw});
});

app.get("/api/profile/:target",async(req,res)=>{
  const {target}=req.params;
  const {name}=req.query;
  const {raw,id}=await api.getProfile(name);
  res.json({data:api.profile(raw,0,{name:target,id}),raw});
});

app.get("/api/data",(req,res)=>{
  res.json(api.getData());
});


const PORT=process.env.PORT || 7777;
const listener=app.listen(PORT,()=>{console.log(`Server is running on PORT ${listener.address().port}`);});
