/* WMO code + externally validated daylight state, no clock-hour guesses. */
(function(root){
 'use strict';
 function classify(code,isDay){
  if(!Number.isInteger(code)||code<0||code>99)return 'unknown';
  if(code===0)return isDay===true?'sun':isDay===false?'moon':'cloud';
  if(code===1||code===2)return isDay===true?'partly':isDay===false?'moon-partly':'cloud';
  if(code===3)return 'cloud';
  if(code===45||code===48)return 'fog';
  if(code>=95&&code<=99)return 'storm';
  if((code>=51&&code<=67)||(code>=80&&code<=82))return 'rain';
  if((code>=71&&code<=77)||code===85||code===86)return 'snow';
  return 'unknown';
 }
 root.UthWeatherConditions={classify:classify};
})(window);
