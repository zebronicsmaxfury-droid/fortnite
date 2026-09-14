// Local teammate chat with natural-language-like replies and team commands.
window.FN = window.FN || {};
(function () {
  const CHAT = { open: false, messages: [], maxMessages: 70, input: null, log: null, panel: null, botT: 4, lastBotByTeam: {} };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mates = () => FN.Match && FN.Match.teammates ? FN.Match.teammates.filter((b) => !b.dead) : [];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const RESPONSES = {
    greeting: ['Hey! We are ready and watching your back.', 'Hey, leader. We are all here.', 'Hello! Weapons ready.', 'Good to hear from you. What is the plan?', 'Hey! We are together and alert.', 'Hello there. We have your six.', 'Yo! Squad is listening.', 'Hi! Call the play and we will move.'],
    identity: ['We are your squad. Ask us to follow, attack, retreat, loot, heal, or regroup.', 'I am your teammate, here to cover you and react to your calls.', 'We are friendly bots on your team, coordinating around your plan.', 'Your squad is online. Give us a clear objective and we will act.', 'We are your support team: fighter, scout, looter, and medic.', 'We know our role and will adapt as the battle changes.'],
    help: ['I can understand natural team orders about movement, fights, loot, healing, and regrouping.', 'Try telling us where to move, who to attack, when to retreat, or what to collect.', 'We can follow, push, fall back, search, recover, revive, and cancel orders.', 'Say “stay close”, “clear that squad”, or “find shields” and we will coordinate.', 'Use normal sentences. We will interpret the important action in your message.', 'We are listening for plans, danger calls, supplies, and medical requests.'],
    location: ['We are tracking your position and will regroup with you.', 'I am moving toward your location now.', 'Your marker is clear. We will close the distance.', 'We know where you are and will cover the route.', 'Checking the area, then I will meet you.', 'We are nearby and ready to support you.'],
    thanks: ['Anytime. We have your back.', 'Good teamwork. Keep calling the plays.', 'You got it. Squad is still strong.', 'No problem. We are watching the angles.', 'Glad to help. We are ready for the next move.', 'That is what teammates are for.', 'Copy. We will keep supporting you.', 'Nice call. We are with you.'],
    general: ['Got it. I understand what you mean and will react with the team.', 'Understood. We are listening and adapting to your plan.', 'Copy that. We will coordinate around your request.', 'I hear you. I will factor that into my next move.', 'Message received. We will stay alert and respond.', 'Understood, leader. I am adjusting my priorities.', 'I follow your meaning. We will handle it together.', 'All right. The squad will work with that plan.']
  };
  const EXTRA_RESPONSES = {
    greeting: ['Hey, I am here.', 'Hello, squad leader.', 'Good timing, I was scanning ahead.', 'Hey! I am ready for orders.', 'Hello! Let us make this rotation count.', 'I hear you loud and clear.', 'Hey, all systems ready.', 'Welcome back, leader.', 'Hi! I am covering the flank.', 'Good to hear you.', 'Hello, I am staying alert.', 'Hey! We are in this together.', 'Your teammate is online.', 'Hi, I am ready to move.', 'Hey, what is our next objective?'],
    identity: ['I am a teammate with my own combat and loot decisions.', 'I can scout, fight, gather gear, and support your movement.', 'I am on your side and share your team number.', 'I watch enemies, supplies, health, and the storm.', 'I am one of the squad members following your plan.', 'I can respond to calls and change priorities quickly.', 'I am your field support bot.', 'I help the squad survive and reach the next safe area.', 'I can fight independently but will answer your orders.', 'I am here to cover, loot, and regroup.', 'I am friendly, armed, and listening.', 'I am part of your team, not an enemy.', 'I can adapt when the battle changes.', 'I will protect the squad whenever I can.', 'I am ready to work with the whole team.'],
    help: ['Describe the goal in your own words and I will find the closest action.', 'You can ask for movement, combat, supplies, healing, or a retreat.', 'I can understand short calls or longer tactical messages.', 'Mention danger and I will treat it as a priority.', 'Tell us what matters most and we will coordinate.', 'Commands can be polite, urgent, or casual.', 'I can react to enemy contact and teammate requests.', 'Ask for cover while healing or help during a push.', 'I understand regroup, rotate, search, protect, and disengage.', 'You do not need to use exact keywords.', 'Give us an objective and we will divide the work.', 'I can cancel an old plan when you change your mind.', 'We can work around your marker and current position.', 'I will interpret the important action in your message.', 'The more detail you give, the better we can coordinate.'],
    location: ['I am just a short move away.', 'I am closing on your position.', 'I have your route in sight.', 'I am checking the nearby cover.', 'I will meet you at the next safe point.', 'I am moving across the area toward you.', 'I am keeping your position in mind.', 'I can see the direction you are taking.', 'I am ready to regroup when you call.', 'I am watching the path between us.', 'I am nearby and not leaving the team.', 'I am moving carefully through the area.', 'I will catch up before the next fight.', 'I am covering your approach.', 'I know where to rotate from here.'],
    thanks: ['Of course, leader.', 'Happy to help the squad.', 'We make a good team.', 'I will keep it up.', 'Always.', 'No worries, I am still watching.', 'That call worked well.', 'We have plenty more fight left.', 'Glad we could help.', 'The squad moves as one.', 'I appreciate the callout.', 'We are ready for whatever comes next.', 'Good communication keeps us alive.', 'I will stay focused.', 'You can count on me.'],
    general: ['I understand the idea and will adapt my behavior.', 'That is clear enough for me to act on.', 'I will keep that request in mind.', 'The squad is processing your plan.', 'I am taking that into account now.', 'I understand the priority you are describing.', 'I will coordinate with the others.', 'That message is received and understood.', 'I will respond to the situation around your request.', 'The team can work with that.', 'I am adjusting my next decision.', 'Your plan is noted.', 'I will stay ready for a change in direction.', 'I understand what you are asking for.', 'We can use that plan.']
  };
  for (const key in RESPONSES) RESPONSES[key].push(...EXTRA_RESPONSES[key]);
  // Six groups of 40 phrases: 240 additional natural-language command forms.
  const COMMANDS = {
    follow: ['follow me now','stay close to me','keep up with me','move with me','travel with me','come over here','come to my position','get to me','join me','regroup on me','rally on me','meet me here','stick by me','watch my back','cover me','keep me covered','stay at my side','walk with me','run with me','rotate with me','we move together','team up with me','form up on me','close ranks','stay as a team','do not split up','no solo moves','return to my side','get back here','come back to me','follow my lead','shadow me','trail me','escort me','stay near me','move to my marker','head to my location','rendezvous with me','gather on me','assemble here'],
    attack: ['attack now','attack that player','attack those players','take the fight','start shooting','open fire','fire on them','engage the enemy','engage that team','push the enemy','push that squad','rush them','focus the target','focus fire','help me fight','join the fight','go aggressive','hunt them down','take them out','eliminate them','pressure that team','break their defense','flank the enemy','challenge them','fight beside me','cover my attack','shoot on sight','enemy contact fight','return fire','make a push','hit them hard','go after them','move on the target','target the enemies','wipe that team','clear the area','defend this fight','contest them','combat mode'],
    retreat: ['run now','get out now','retreat now','fall back now','pull back','back away','disengage','leave the fight','stop fighting','escape the area','evacuate','move away','run for safety','get to safety','take cover and run','rotate out','rotate away','avoid that team','do not engage','break contact','withdraw','flee the area','get clear','move to safety','save yourselves','survive this','leave immediately','go go go','we need to leave','back up','make distance','abandon this fight','run from them','escape those enemies','take us out of here','retreat to me','fall back to me','regroup safely','hide and recover','emergency retreat'],
    loot: ['loot this place','search the area','look for loot','find supplies','collect supplies','pick up everything','grab that item','take the loot','gather weapons','find weapons','find ammo','get some ammo','look for healing','search nearby','check that chest','open the chest','scavenge here','farm materials','gather materials','collect weapons','pick up that gun','bring me loot','share the loot','secure the supplies','loot after the fight','search the buildings','check the floor loot','find shields','look for minis','find a medkit','grab useful items','take what we need','resupply the team','restock us','hunt for gear','check for upgrades','loot the houses','search every room','gather what you can'],
    heal: ['heal me','heal yourself','heal the team','use your meds','use a medkit','use shields','drink a shield','recover now','recover fast','recover quickly','heal fast','get healing fast','help me recover','recover the team','revive our teammate','get the revive','help the downed player','save our teammate','bring healing','find healing','look for meds','get bandages','find shields for us','restore health','take a moment to heal','stop and recover','patch yourselves up','heal before moving','protect the healer','watch while we heal','support the revive','help with recovery','get ready to revive','treat your wounds','heal up now','regain shields','use consumables','find a campfire','help anyone hurt','stabilize the team','recover health','recover shields','medical help now','we need healing'],
    cancel: ['cancel that order','stop that order','ignore my last order','never mind that','resume normal behavior','do your own thing','clear the command','forget that','stand down','cancel attack','cancel retreat','cancel follow','cancel looting','cancel healing','stop what you are doing','end the command','reset your orders','return to normal','normal decisions now','no more orders','disregard that','abort mission','drop that plan','change of plan','scratch that','stop immediately','hold your behavior','free yourselves','go back to normal','resume your routine','clear all orders','cancel everything','forget the plan','we are changing plans','do not do that','cease the order','stand down team','reset team commands','command cancelled','all clear']
  };
  // Generate 1,200 additional command forms (200 per command category).
  const variantStarts = {
    follow: ['please','can you','i need you to','i want you to','team','everyone','guys','listen','right now','for me'],
    attack: ['please','can you','i need you to','i want you to','team','everyone','guys','listen','right now','for me'],
    retreat: ['please','can you','i need you to','i want you to','team','everyone','guys','listen','right now','for me'],
    loot: ['please','can you','i need you to','i want you to','team','everyone','guys','listen','right now','for me'],
    heal: ['please','can you','i need you to','i want you to','team','everyone','guys','listen','right now','for me'],
    cancel: ['please','can you','i need you to','i want you to','team','everyone','guys','listen','right now','for me']
  };
  const variantEnds = {
    follow: ['follow my lead','stay by my side','keep formation','move as a group','stay with me','come to my marker','cover my position','regroup here','do not split','keep close','walk beside me','join my route','meet at my location','stay on my flank','return to formation','move to me','escort me','rally here','remain nearby','travel together'],
    attack: ['attack the target','fight that squad','engage the enemy','push those players','open fire now','focus that enemy','help me shoot','clear that team','take the fight','pressure them','flank the target','join my attack','defend this fight','hunt those enemies','eliminate the threat','shoot the attackers','challenge that squad','push with me','fight at my marker','take them down'],
    retreat: ['fall back now','run to safety','leave the fight','move away','get out of here','disengage immediately','rotate to safety','avoid that squad','break contact','pull back to me','escape the area','withdraw from combat','take cover','stop pushing','survive this fight','get clear now','retreat together','abandon the target','move behind cover','save the team'],
    loot: ['search this area','look for supplies','collect nearby loot','find useful weapons','gather ammo','check the buildings','open nearby chests','find shields','search for healing','pick up good items','collect materials','resupply the team','look for upgrades','secure this loot','scavenge the area','check every room','bring back supplies','search the floor','find a better gun','loot around here'],
    heal: ['heal the team','recover your health','use medical items','find a medkit','bring healing supplies','revive our teammate','protect the revive','cover the healer','restore your shields','look for bandages','help the hurt player','stop and heal','recover before moving','find medical loot','use your consumables','stabilize the squad','heal whoever needs it','get shields for us','support recovery','take care of injuries'],
    cancel: ['cancel the current plan','stop following that order','ignore the last command','return to normal','stand down now','forget that request','clear all instructions','resume normal behavior','abort the mission','drop that plan','stop the attack','stop the retreat','stop searching','stop healing','reset your priorities','end that action','change the plan','do not continue','release the order','go back to routine']
  };
  for (const key in variantStarts) for (const start of variantStarts[key]) for (const end of variantEnds[key]) COMMANDS[key].push(start + ' ' + end);
  CHAT.init = function () {
    if (CHAT.panel) return;
    const p = document.createElement('div'); p.id = 'team-chat';
    p.innerHTML = '<div class="tc-head"><span>TEAM CHAT</span><span class="tc-hint">F to close</span></div><div class="tc-log"></div><form class="tc-form"><span class="tc-prompt">&gt;</span><input class="tc-input" maxlength="180" autocomplete="off" spellcheck="false" placeholder="Talk to your teammates..."></form>';
    document.body.appendChild(p); CHAT.panel = p; CHAT.log = p.querySelector('.tc-log'); CHAT.input = p.querySelector('.tc-input');
    p.querySelector('.tc-form').addEventListener('submit', (e) => { e.preventDefault(); CHAT.send(CHAT.input.value); });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && !CHAT.open && !e.repeat && FN.Match && FN.Match.mode !== 'solo' && FN.Match.phase !== 'lobby' && FN.Match.phase !== 'end') { e.preventDefault(); CHAT.openChat(); }
      else if (CHAT.open && (e.code === 'Escape' || e.code === 'Tab')) { e.preventDefault(); CHAT.close(); }
    });
  };
  CHAT.isOpen = () => CHAT.open;
  CHAT.toggle = function () { if (CHAT.open) CHAT.close(); else CHAT.openChat(); };
  CHAT.openChat = function () { CHAT.open = true; CHAT.panel.style.display = 'flex'; CHAT.render(); CHAT.input.focus(); if (FN.Input && FN.Input.isLocked()) FN.Input.unlock(); };
  CHAT.close = function () { CHAT.open = false; if (CHAT.panel) CHAT.panel.style.display = 'none'; if (CHAT.input) CHAT.input.blur(); if (FN.Match && FN.Match.phase !== 'lobby' && FN.Match.phase !== 'end' && FN.Input && !FN.Input.isLocked()) FN.Input.lock(); };
  CHAT.add = function (name, text, kind) { CHAT.messages.push({ name, text, kind: kind || 'bot' }); if (CHAT.messages.length > CHAT.maxMessages) CHAT.messages.shift(); CHAT.render(); };
  CHAT.render = function () { if (CHAT.log) { CHAT.log.innerHTML = CHAT.messages.map((m) => '<div class="tc-line ' + m.kind + '"><span class="tc-name">' + esc(m.name) + '</span><span class="tc-text">' + esc(m.text) + '</span></div>').join(''); CHAT.log.scrollTop = CHAT.log.scrollHeight; } };
  CHAT.command = function (text) {
    const t = text.toLowerCase();
    const groups = [['follow', 0, 'On you. We will stay together.'], ['attack', 1, 'Target understood. We are engaging.'], ['retreat', 3, 'Moving out now. Follow my lead.'], ['loot', 4, 'We will look for useful loot and share what we can.'], ['heal', 5, 'We are checking health and helping the team.'], ['cancel', 6, 'Command cancelled. Resuming normal decisions.']];
    const simple = { follow: 0, attack: 1, fight: 1, push: 1, retreat: 3, run: 3, loot: 4, take: 4, pickup: 4, pick: 4, heal: 5, recover: 5, cancel: 6, stop: 6 };
    const first = t.match(/^\s*(follow|attack|fight|push|retreat|run|loot|take|pickup|pick|heal|recover|cancel|stop)\b/);
    if (first) { const i = simple[first[1]]; return [i, groups.find((g) => g[1] === i)[2]]; }
    for (const [key, index, answer] of groups) if (COMMANDS[key].some((phrase) => t.includes(phrase))) return [index, answer];
    return null;
  };
  CHAT.reply = function (text) {
    const team = mates(); if (!team.length) { CHAT.add('TEAM', 'I cannot hear you right now. Start a duo or squad match first.'); return; }
    const lower = text.toLowerCase(), cmd = CHAT.command(text); let answer, responseBank = RESPONSES.general;
    if (cmd) { const commandReplies = [cmd[1], 'Copy that. I am acting on it.', 'Understood. Moving with the team.', 'I heard you. Executing the order now.', 'That plan makes sense. I am on it.', 'Confirmed. We will coordinate together.']; FN.Bots.issueCommand(cmd[0]); team.forEach((b, i) => setTimeout(() => { if (!b.dead) CHAT.add(b.name, pick(commandReplies)); }, 250 + i * 220)); return; }
    if (/\b(help|assist|support|save|heal|cover|defend|protect)\b/.test(lower) && (
         /\b(fight|combat|engage|target|shoot|fire|fight|clash)\b/.test(lower) ||
         /\b(heal|med|medical|recover|bandage|medkit|shields)\b/.test(lower) ||
         /\b(loot|gather|search|find|collect|grab|take|scavenge)\b/.test(lower)
       )) { responseBank = RESPONSES.help; }
    else if (/\b(hi|hello|hey|yo|sup)\b/.test(lower)) responseBank = RESPONSES.greeting;
    else if (/\b(who are you|your name|names)\b/.test(lower)) responseBank = RESPONSES.identity;
    else if (/\b(help|what can you|commands|understand)\b/.test(lower)) responseBank = RESPONSES.help;
    else if (/\b(where|location|position|here)\b/.test(lower)) responseBank = RESPONSES.location;
    else if (/\b(thanks|thank you|thx|good job|nice)\b/.test(lower)) responseBank = RESPONSES.thanks;
    answer = pick(responseBank);
    team.forEach((b, i) => setTimeout(() => { if (!b.dead) CHAT.add(b.name, pick(responseBank)); }, 300 + i * 240));
  };
  CHAT.send = function (raw) { const text = raw.trim(); if (!text) return; CHAT.add(FN.Player && FN.Player.name ? FN.Player.name : 'YOU', text, 'user'); CHAT.input.value = ''; CHAT.reply(text); };
  const BOT_REACTIONS = {
    fight: ['I am coming to help!', 'I have your angle.', 'On the way to the fight.', 'Keep pressure on them.', 'I see the target and am joining.', 'Covering you now.'],
    loot: ['I will check the next building.', 'I am bringing supplies over.', 'I found a useful item.', 'Searching nearby for upgrades.', 'I will share ammo with the team.', 'Checking the area for shields.'],
    heal: ['I can cover while you heal.', 'I am bringing medical supplies.', 'Stay safe, I am watching the area.', 'I will help with recovery.', 'I am checking who needs healing.', 'The team needs to protect our medic.'],
    move: ['I am moving with you.', 'I see the route.', 'Regrouping now.', 'I will stay close.', 'Moving to the callout.', 'I am covering the rotation.'],
    help: ['I need help in fighting!', 'I need healing assistance!', 'I can help with looting!', 'I need to heal!', 'I need to recover health!', 'I need medical supplies!', 'I need help in the fight!', 'I need healing!', 'I need to loot!', 'I can assist with combat!', 'I need healing supplies!', 'I need medical attention!']
  };
  const BOT_PREFIX = {
    fight: ['I need help in fighting!', 'Need help with combat!', 'Help in the fight!', 'Need assistance fighting!', 'Help with fighting!', 'Can someone help in combat!', 'I need help fighting!', 'Need help in the fight!', 'Help with the fight!', 'Need assistance in combat!', 'Help with fighting!', 'I need help in combat!', 'Need help fighting!', 'Help with the fight!', 'Can someone help me fight!', 'I need help in battle!', 'Need help fighting!', 'Help with combat!', 'I need help in the fight!', 'Need help with fighting!'],
    loot: ['I need help in looting!', 'Need help looting!', 'Help with looting!', 'Can someone help loot!', 'I need help gathering!', 'Need assistance looting!', 'Help with collecting!', 'I need help looting supplies!', 'Need help finding items!', 'Help with searching!', 'I need help in looting area!', 'Need help gathering items!', 'Help with looting now!', 'I need help looting supplies!', 'Need help with looting!', 'Help with finding items!', 'I need help in looting!', 'Need help collecting!', 'Help with looting supplies!', 'I need help finding items!'],
    heal: ['I need help healing!', 'Need help healing!', 'Help me heal!', 'Can someone help heal!', 'I need medical assistance!', 'Need help recovering!', 'Help with healing!', 'I need help healing now!', 'Need help with medical!', 'Help me recover!', 'I need help with health!', 'Need assistance healing!', 'Help with recovery!', 'I need help healing up!', 'Need help with health recovery!', 'Help me get healed!', 'I need help healing myself!', 'Need help with medical supplies!', 'Help with health recovery!', 'I need help in healing!'],
    move: ['I need help moving!', 'Need help moving!', 'Help with movement!', 'Can someone help move!', 'I need help rotating!', 'Need help with positioning!', 'Help with movement!', 'I need help moving to safety!', 'Need help with rotation!', 'Help with movement strategy!', 'I need help moving in the area!', 'Need help with movement planning!', 'Help with movement!']
  };
  function botSpeech(type) {
    const phrase = pick(COMMANDS[type === 'move' ? 'follow' : type === 'fight' ? 'attack' : type]);
    return pick(BOT_PREFIX[type]) + ' ' + phrase + '.';
  }
  CHAT.update = function (dt) {
    if (!FN.Match || FN.Match.mode === 'solo' || FN.Match.phase === 'lobby' || FN.Match.phase === 'end') { if (CHAT.open) CHAT.close(); return; }
    CHAT.botT -= dt; if (CHAT.botT > 0 || !FN.Bots || !FN.Bots.list) return;
    CHAT.botT = 6 + Math.random() * 9;
    const active = FN.Bots.list.filter((b) => !b.dead && !b.aboard && (b.team > 0 || b.isTeammate));
    if (!active.length) return;
    const bot = active[Math.floor(Math.random() * active.length)];
    const type = bot.target && !bot.target.dead ? 'fight' : (bot.state === 'heal' || bot.state === 'recover' || bot.health < 58 ? 'heal' : (bot.state === 'loot' ? 'loot' : 'move'));
    if (bot.team === 0 || bot.isTeammate) CHAT.add(bot.name, botSpeech(type));
    const allies = active.filter((b) => b !== bot && b.team === bot.team);
    if (allies.length && Math.random() < 0.75) {
      const ally = allies[Math.floor(Math.random() * allies.length)];
      if (type === 'fight' && bot.target && !bot.target.dead) { ally.target = bot.target; ally.state = 'engage'; ally.engageT = FN.Bots.matchTime; }
      else if (type === 'move') { ally.commandType = 'follow'; ally.commandT = 30; ally.goal = null; ally.state = 'follow'; }
      else if (type === 'loot') { FN.Bots.buildLootQueue(ally, 55); if (ally.lootQueue.length) ally.state = 'loot'; }
      else if (type === 'heal') { ally.commandType = 'recover'; ally.commandT = 120; ally.state = 'recover'; }
      setTimeout(() => { if (!ally.dead && (ally.team === 0 || ally.isTeammate) && FN.Match && FN.Match.mode !== 'solo') CHAT.add(ally.name, pick(BOT_REACTIONS[type])); }, 350 + Math.random() * 650);
      if (type === 'fight' || type === 'heal' || type === 'loot') {
        const activeAllies = active.filter((b) => b !== bot && b.team === bot.team && !b.dead);
        if (activeAllies.length && Math.random() < 0.75) {
          const ally = activeAllies[Math.floor(Math.random() * activeAllies.length)];
          if (!ally.dead && (ally.team === 0 || ally.isTeammate) && FN.Match && FN.Match.mode !== 'solo') {
            if (type === 'fight') CHAT.add(ally.name, pick(BOT_REACTIONS.fight));
            else if (type === 'heal') CHAT.add(ally.name, pick(BOT_REACTIONS.heal));
            else if (type === 'loot') CHAT.add(ally.name, pick(BOT_REACTIONS.loot));
            else CHAT.add(ally.name, pick(BOT_REACTIONS.help));
          }
        }
      }
      if (bot.state === 'fight' || bot.state === 'heal' || bot.state === 'loot' || bot.state === 'move') {
        const activeAllies = active.filter((b) => b !== bot && b.team === bot.team && !b.dead);
        if (activeAllies.length && Math.random() < 0.75) {
          const ally = activeAllies[Math.floor(Math.random() * activeAllies.length)];
          if (!ally.dead && (ally.team === 0 || ally.isTeammate) && FN.Match && FN.Match.mode !== 'solo') {
            if (bot.state === 'fight') CHAT.add(ally.name, pick(BOT_REACTIONS.fight));
            else if (bot.state === 'heal') CHAT.add(ally.name, pick(BOT_REACTIONS.heal));
            else if (bot.state === 'loot') CHAT.add(ally.name, pick(BOT_REACTIONS.loot));
            else CHAT.add(ally.name, pick(BOT_REACTIONS.help));
          }
        }
      }
    }
  };
  FN.TeamChat = CHAT;
})();
