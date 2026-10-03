/* @ds-bundle: {"format":4,"namespace":"MinhAnGi","components":[{"name":"Button"},{"name":"FoodCard"},{"name":"DayHeader"}]} */
(function(){
var R=window.React,h=R.createElement;
function cx(){return Array.prototype.filter.call(arguments,Boolean).join(" ");}
function splitName(n){
  var m=/^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(n||"");
  return m?{main:m[1],sub:m[2]}:{main:n||"",sub:""};
}
function Button(p){
  var v=p.variant||"primary",s=p.shape||"pill";
  return h("button",{type:"button",className:cx("kdc-btn kdc-bounce",v,s,p.className),disabled:!!p.disabled,onClick:p.onClick,"aria-label":p.ariaLabel},p.children);
}
function FoodCard(p){
  var st=p.state||"idle",grp=p.group==="rau"?"rau":"man",blocked=st==="locked"||st==="recent";
  var full=p.title||p.name||"",nm=splitName(full);
  return h("div",{className:cx("kdc-card",grp,st,p.size==="lg"?"lg":"")},
    h("button",{type:"button",className:"hit kdc-bounce",disabled:blocked,"aria-pressed":st==="selected",onClick:blocked?undefined:p.onSelect},
      h("span",{className:"ph"},p.image?h("img",{src:p.image,alt:"",width:1200,height:1200,loading:"lazy"}):h("i",{className:"plate","aria-hidden":true})),
      h("span",{className:"nm"},nm.main),
      nm.sub?h("span",{className:"sub",lang:"ja"},nm.sub):null
    ),
    st==="recent"?h("span",{className:"tag"},"Vừa ăn"):null,
    st==="selected"&&p.onRemove?h("button",{type:"button",className:"x","aria-label":"Bỏ chọn "+nm.main,onClick:function(e){e.stopPropagation();p.onRemove();}},h("span",null,"✕")):null
  );
}
function DayHeader(p){
  var i=Number(p.index)||1,t=Number(p.total)||2,dots=[];
  for(var k=1;k<=t;k++)dots.push(h("i",{key:k,className:k<=i?"on":""}));
  return h("div",{className:"kdc-day"},h("span",{className:"chip"},"Ngày "+i+"/"+t),h("span",null,"· "+(p.weekday||"")),h("span",{className:"dots","aria-hidden":true},dots));
}
window.MinhAnGi=Object.assign(window.MinhAnGi||{},{Button:Button,FoodCard:FoodCard,DayHeader:DayHeader,splitName:splitName});
})();
