var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var Twit = require('twit');
var T = new Twit(require('./config.js'));
if (process.env.REDISTOGO_URL) {
  var rtg   = require('url').parse(process.env.REDISTOGO_URL);
  var redis = require('redis');
  var client = redis.createClient(rtg.port, rtg.hostname);
  client.auth(rtg.auth.split(':')[1]);
} else {
  var redis = require('redis'), client = redis.createClient();
}

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};

// Redis

client.on('error', function (err) {
  console.log('Error ' + err);
});

var people = [
'Marilyn Monroe','Abraham Lincoln','Mother Teresa','John F. Kennedy','Martin Luther King','Nelson Mandela ','Winston Churchill ','Bill Gates ','Muhammad Ali','Mahatma Gandhi','Margaret Thatcher','Charles de Gaulle','Christopher Columbus','George Orwell ','Charles Darwin','Elvis Presley','Albert Einstein','Paul McCartney','Plato','Queen Elizabeth ','Queen Victoria','John M Keynes','Mikhail Gorbachev','Jawaharlal Nehru ','Leonardo da Vinci','Louis Pasteur','Leo Tolstoy','Pablo Picasso','Vincent Van Gogh','Franklin D. Roosevelt','Pope John Paul II','Thomas Edison','Rosa Parks ','Aung San Suu Kyi ','Lyndon Johnson','Ludwig Beethoven','Oprah Winfrey','Indira Gandhi','Eva Peron','Benazir Bhutto','Desmond Tutu','Dalai Lama','Walt Disney','Peter Sellers','Barack Obama','Malcolm X','J.K.Rowling','Richard Branson','Pele','Jesse Owens','Ernest Hemingway','John Lennon','Henry Ford','Haile Selassie','Joseph Stalin','Lord Baden Powell','Vladimir Lenin','Oscar Wilde ','Coco Chanel ','Pope Francis','Amelia Earhart','Adolf Hitler ','Sting','Mary Magdalene','Alfred Hitchcock','Michael Jackson','Madonna ','Mata Hari ','Cleopatra','Emmeline Pankhurst ','Bob Geldof','Roger Federer','Woodrow Wilson','Mao Zedong','Katherine Hepburn','Audrey Hepburn','David Beckham','Usain Bolt','Carl Lewis','Prince Charles','Jacqueline Kennedy Onassis','C.S. Lewis ','Billie Holiday','J.R.R. Tolkien','Billie Jean King','Simon Bolivar','Anne Frank','Marie Antoinette','Emile Zatopek','Lech Walesa','Julie Andrews','Florence Nightingale','Marie Curie','Stephen Hawking ','Tim Berners Lee','Lance Armstrong','Shakira','Paul Krugman','Jennifer Lawrence', 'Christian Bale', 'Cate Blanchett', 'Sandra Bullock', 'Tom Hanks', 'Emma Thompson', 'Natalie Portman', 'Angelina Jolie', 'Anne Hathaway', 'Charlize Theron', 'Julia Roberts', 'Jennifer Connelly', 'Kate Winslet', 'George Clooney', 'Heath Ledger', 'Kevin Costner', 'Nicole Kidman', 'Nicolas Cage', 'Reese Witherspoon', 'Anna Paquin', 'Kim Basinger', 'Sean Penn', 'Denzel Washington', 'Catherine Zeta-Jones', 'Daniel Day-Lewis', 'Kevin Spacey', 'Rachel Weisz', 'Gwyneth Paltrow', 'Penelope Cruz', 'Mel Gibson', 'Russell Crowe', 'Marion Cotillard', 'Marisa Tomei', 'Halle Berry', 'Jodie Foster', 'Robin Williams', 'Geoffrey Rush', 'Rene Zellweger', 'Holly Hunter', 'Colin Firth', 'Peter Jackson', 'Javier Bardem', 'Ron Howard', 'Joel Coen', 'Tilda Swinton', 'Steven Soderbergh', 'Hilary Swank', 'Justin Bieber', 'Justin Timberlake', 'Beyonce', 'Stephen Colbert', 'Nikola Tesla', 'Kanye West', 'Kim Kardashian', 'Miley Cyrus', 'Friedrich Nietzsche', 'Katy Perry', 'Robert Downey Jr', 'Channing Tatum', 'Idris Elba', 'Dwayne "The Rock" Johnson', 'Donald Trump', 'Glenn Beck', 'Kristen Stewart', 'Jon Stewart', 'Amy Poehler', 'Tina Fey', 'Kerry Washington', 'Neil Patrick Harris', 'Zooey Deschanel', 'Melissa McCarthy'
];

people = _.map(people, function(el) {
  return el.trim();
});

function generate() {
  var dfd = new _.Deferred();
  var tmpPeople = people;

  var name0 = tmpPeople.pickRemove();
  var name1 = tmpPeople.pickRemove();
  var name2 = tmpPeople.pickRemove();

  client.set('name0', name0, redis.print);
  client.set('name1', name1, redis.print);
  client.set('name2', name2, redis.print);
  client.del('name0:vote', redis.print);
  client.del('name1:vote', redis.print);
  client.del('name2:vote', redis.print);

  var tweet = name0 + ', ' + name1 + ', ' + name2 +
              '\n\nSee Twitter bio for voting rules.\nYou have 4 hours.';
              

  dfd.resolve(tweet);
  return dfd.promise();
}

function tweet() {
  generate().then(function(myTweet) {
    console.log(myTweet);
    T.post('statuses/update', { status: myTweet }, function(err, reply) {
      if (err) {
        console.log('error:', err);
      }
      else {
        console.log('reply:', reply.id_str);
        client.set('lastId', reply.id_str, redis.print);
      }
    });
  });
}

// Tweet once on initialization

function getNames() {
  var dfd = new _.Deferred();
  var name0, name1, name2;

  client.get('name0', function(e,r) {
    name0 = r;
    client.get('name1', function(e,r) {
      name1 = r;
      client.get('name2', function(e,r) {
        name2 = r;
        dfd.resolve([name0, name1, name2]);
      });
    });
  });
 

  return dfd.promise();
}

function evalResults(f, m, k) {
  // Get the names
  getNames().done(function(names) {
    var results = names;
    console.log('fuck: ' + results[f]);
    console.log('marry: ' + results[m]);
    console.log('kill: ' + results[k]);
    if (f === 0) { client.rpush('name0:vote','fuck'); }
    if (f === 1) { client.rpush('name1:vote','fuck'); }
    if (f === 2) { client.rpush('name2:vote','fuck'); }
    if (m === 0) { client.rpush('name0:vote','marry'); }
    if (m === 1) { client.rpush('name1:vote','marry'); }
    if (m === 2) { client.rpush('name2:vote','marry'); }
    if (k === 0) { client.rpush('name0:vote','kill'); }
    if (k === 1) { client.rpush('name1:vote','kill'); }
    if (k === 2) { client.rpush('name2:vote','kill'); }
  });
}

function tally() {
  client.lrange('name0:vote', '0', '-1', function(e,r) {
    var tally0 = _.chain(r).countBy(function(el) { return el; }).defaults({fuck: 0, marry: 0, kill: 0}).value();
    console.log(tally0);

    client.lrange('name1:vote', '0', '-1', function(e,r) {
      var tally1 = _.chain(r).countBy(function(el) { return el; }).defaults({fuck: 0, marry: 0, kill: 0}).value();
      console.log(tally1);

      client.lrange('name2:vote', '0', '-1', function(e,r) {
        var tally2 = _.chain(r).countBy(function(el) { return el; }).defaults({fuck: 0, marry: 0, kill: 0}).value();
        console.log(tally2);
        var tallies = [tally0, tally1, tally2];
        var fuckWinner = _.pluck(tallies,'fuck').indexOf(
                             _.chain(tallies)
                              .pluck('fuck')
                              .max(function(el) { return el;})
                              .value());
        var marryWinner = _.pluck(tallies,'marry').indexOf(
                             _.chain(tallies)
                              .pluck('marry')
                              .max(function(el) { return el;})
                              .value());
        var killWinner = _.pluck(tallies,'kill').indexOf(
                             _.chain(tallies)
                              .pluck('kill')
                              .max(function(el) { return el;})
                              .value());
        console.log('k',killWinner,'m',marryWinner,'f',fuckWinner);
        var winnerIndices = [killWinner, fuckWinner, marryWinner];
        // get repeated value if any
        var repeat = _.chain(winnerIndices).countBy(function(el) {
          return el;}).pairs().filter(function(el) {
             return el[1] !== 1; }).value();
        if (repeat.length > 0) {
          repeat = +repeat[0][0];
          var missing = _.difference([0,1,2],winnerIndices)[0];
          // replace repeat with missing
          winnerIndices[winnerIndices.indexOf(repeat)] = missing;
          killWinner = winnerIndices[0];
          fuckWinner = winnerIndices[1];
          marryWinner = winnerIndices[2];
        }

        console.log('k',killWinner,'m',marryWinner,'f',fuckWinner);
        getNames().done(function(names) {
          var finalResult = [
            'Results:\nFuck: ' + names[fuckWinner] + '\nMarry: ' + names[marryWinner] + '\nKill: ' + names[killWinner],
            'We fucked ' + names[fuckWinner] + ', married ' + names[marryWinner] + ', and killed ' + names[killWinner] + '.'
          ].pick();
          console.log(finalResult);
          T.post('statuses/update', { status: finalResult }, function(err, reply) {
            if (err) {
              console.log('error:', err);
            }
            else {
              console.log('reply:', reply.id_str);
              client.set('lastId', reply.id_str, redis.print);
            }
          });

        });


      });
    });
  });
}

var stream = T.stream('user');
stream.on('tweet', function (tweet) {
    console.log(tweet.text);
    client.get('lastId', function(err, reply) {
      console.log('redis GET:', err, reply);
      if (tweet.text && tweet.in_reply_to_status_id_str) {
        var vote = tweet.text;
        console.log('yay!');
        vote = vote.replace(/@fmkvote/i,'').replace(/[^fmkFMK]/g,'').toLowerCase().substr(0,3);
        var fPos = vote.indexOf('f');
        var mPos = vote.indexOf('m');
        var kPos = vote.indexOf('k');
        if (fPos >= 0 && mPos >= 0 && kPos >= 0) {
          console.log('valid vote!');
          evalResults(fPos, mPos, kPos);
        }
      }
    });
});

// Every 8 hours tweet and then 4 hours later tally
tweet();
setTimeout(tally, 1000*60*60*4);
setInterval(function() {
  tweet();
  setTimeout(tally, 1000*60*60*4);
}, 1000*60*60*8);
