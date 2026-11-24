import {navigate, registerRoute} from "../../shared/navigation.js";
import {claimReward} from "./data.js";

export function openCollection(){
  claimReward(5);
  registerRoute("reward","modules/reward/index.html");
  navigate("reward",{sort:"newest",focus:5,from:"mission"});
}
