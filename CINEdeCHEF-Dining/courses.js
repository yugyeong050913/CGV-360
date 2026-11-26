import * as T from 'three';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

export const menu = [
  ['랍스터 비스퀴', '랍스터 살과 크림을 곁들인 진한 비스퀴'],
  ['채끝 등심 스테이크', '노릇하게 구운 채끝과 아스파라거스, 레드 와인 소스'],
  ['망고 오미자', '망고와 오미자 젤리를 층층이 담은 디저트'],
];

export function setTable(scene) {
  const suite = scene.getObjectByName('Suite C03 / C04');
  const table = new T.Group();
  table.position.set(-1.76, 0.815, -0.89);
  suite.add(table);
  const target = table.getWorldPosition(new T.Vector3());
  function part(parent, geometry, color, x, y, z, options = {}) {
    const material = new T.MeshStandardMaterial({ color, roughness: 0.38, side: T.DoubleSide, ...options });
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function turned(parent, profile, color, x = 0, z = 0, options) {
    return part(parent, new T.LatheGeometry(profile.map(([r,h]) => new T.Vector2(r,h)), 64), color, x, 0, z, options);
  }
  function oval(parent, color, x,y,z, a,b,c) {
    const piece = part(parent, new T.SphereGeometry(1,24,14), color,x,y,z);
    piece.scale.set(a,b,c);
    return piece;
  }
  const glass = { transparent: true, opacity: 0.23, depthWrite: false, roughness: 0.12 };
  turned(table, [[0,0],[.043,.002],[.035,.006],[.005,.011],[.003,.095],[.013,.103],[.043,.126],[.054,.156],[.049,.19],[.039,.218],[.037,.218],[.047,.19],[.052,.156],[.041,.13],[.011,.107],[0,.106]],0xece5dc,.235,-.19,glass);
  turned(table, [[0,.109],[.012,.11],[.04,.13],[.05,.155],[.05,.164],[0,.164]],0x680e29,.235,-.19,{roughness:.19});
  const dishes = menu.map(() => {
    const group = new T.Group();
    table.add(group);
    group.position.set(-.038,0,.024);
    turned(group, [[0,.001],[.099,.001],[.145,.009],[.172,.017],[.17,.021],[.132,.015],[.10,.009],[0,.009]],0xf5e8d5);
    turned(group, [[.167,.0205],[.169,.021]],0xc7a464);
    return group;
  });
  const [bisque,steak,dessert] = dishes;
  turned(bisque,[[0,.01],[.064,.01],[.087,.026],[.112,.065],[.119,.09],[.114,.091],[.107,.065],[.08,.031],[0,.02]],0xf1e0c8);
  turned(bisque,[[0,.078],[.11,.078],[.112,.081],[0,.081]],0xc96738);
  const spiral = Array.from({length:65},(_,i)=>{
    const theta=i*.15, r=.016+i*.00085;
    return new T.Vector3(r*Math.cos(theta),.082,r*Math.sin(theta));
  });
  part(bisque,new T.TubeGeometry(new T.CatmullRomCurve3(spiral),64,.0015,6,false),0xf3ce9a,0,0,0);
  for(let i=0;i<4;i++) oval(bisque,i%2?0xffbe88:0xdc744b,-.035+i*.015,.088,.007,.012,.011,.019);
  function leaves(group,x,y,z){
    for(let i=0;i<3;i++){
      const leaf=oval(group,0x527d3c,x+Math.cos(i*2)*.009,y+i*.001,z+Math.sin(i*2)*.009,.008,.003,.017);
      leaf.rotation.y=i*2;
    }
  }
  leaves(bisque,.029,.092,-.012);
  oval(steak,0x613321,-.02,.013,.012,.115,.004,.082);
  const cut=part(steak,new RoundedBoxGeometry(.177,.045,.112,4,.021),0x844527,-.027,.039,.011);
  cut.rotation.y=-.2;
  for(let i=-2;i<=2;i++){
    const mark=oval(steak,0x4d2b1d,-.027+i*.026,.061,.01,.003,.0018,.035);
    mark.rotation.y=-.47;
  }
  for(let i=0;i<3;i++){
    oval(steak,0x678944,.069+i*.011,.024,-.014,.005,.007,.066);
    oval(steak,0x486032,.069+i*.011,.025,-.081,.007,.009,.014);
  }
  leaves(steak,-.065,.064,-.01);
  turned(dessert,[[0,.012],[.046,.012],[.051,.021],[.066,.123],[.063,.123],[.048,.024],[0,.019]],0xf3ebdc,0,0,glass);
  for(const [lo,hi,r1,r2,col] of [[.019,.045,.047,.051,0x9d2247],[.045,.076,.051,.055,0xffc144],[.076,.087,.055,.056,0xffeac5],[.087,.111,.056,.06,0xf5ac24]]){
    turned(dessert,[[0,lo],[r1,lo],[r2,hi],[0,hi]],col);
  }
  for(const [x,z,angle] of [[-.025,0,.4],[.013,.022,-.2],[.012,-.019,.75]]){
    part(dessert,new RoundedBoxGeometry(.034,.021,.032,2,.004),0xffbe38,x,.12,z).rotation.y=angle;
  }
  for(let i=0;i<3;i++) oval(dessert,0xb32948,-.025+i*.013,.126,.027,.007,.007,.007);
  leaves(dessert,.013,.134,-.012);
  dishes.forEach((dish,i)=>{dish.visible=i===0;});
  return { dishes, target };
}
