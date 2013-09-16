App = Ember.Application.create();

App.store = DS.Store.create({
  adapter: DS.Firebase.Adapter.create({
    dbName: window.dbName
  })
});

App.Idea = DS.Firebase.LiveModel.extend({
  title: DS.attr('string'),
  votes: DS.hasMany('App.Vote'),
  timestamp: DS.attr('date'),

  voteCount: function() {
    return this.get('votes.length');
  }.property('votes.@each'),

  voteOf: function(user) {
    return this.get('votes').find(function(vote) {
      return vote.get('voter') === user;
    });
  },

  isVotedBy: function(user) {
    return this.get('votes').mapProperty('voter').contains(user);
  }
});

App.User = DS.Firebase.LiveModel.extend({
  initialVotes: 10,

  name: DS.attr('string'),
  displayName: DS.attr('string'),
  avatarUrl: DS.attr('string'),
  displayName: DS.attr('string'),
  votes: DS.hasMany('App.Vote'),
  votesEarned: DS.attr('number'),

  _votesEarned: function() {
    //NOTE: Unfortunately { defaultValue: 0 } does not work
    //since the model is already fetched from the database before creating it
    return this.get('votesEarned') ? this.get('votesEarned') : 0;
  }.property('votesEarned'),

  votesLeft: function() {
    return this.get('initialVotes') - this.get('votes.length') + this.get('_votesEarned');
  }.property('initialVotes', 'votes.length', '_votesEarned')
});

App.Vote = DS.Firebase.LiveModel.extend({
  voter:     DS.belongsTo('App.User'),
  idea:      DS.belongsTo('App.Idea'),
  createdAt: DS.attr('date')
});

App.Router.map(function() {
  this.resource('ideas', function() {
    this.route('new');
  });
});

App.ApplicationRoute = Ember.Route.extend({
  setupController: function() {
    // This is needed for App.Vote associations to be properly
    // materialized by the time votersSentence is rendered
    App.Vote.find();
  }
});

App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('ideas.index');
  }
});

App.IdeasRoute = Ember.Route.extend({
  model: function() {
    return App.Idea.find();
  }
});

App.IdeasIndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('ideas.new');
  }
});

App.IdeasNewRoute = Ember.Route.extend({
  model: function() {
    return App.Idea.createRecord();
  }
});

App.ApplicationController = Ember.Controller.extend({
  auth: null,
  needs: ['auth'],
  authBinding: 'controllers.auth',

  login: function() {
    this.get('auth').login();
  },

  logout: function() {
    this.get('auth').logout();
  }
});

App.IdeasController = Ember.ArrayController.extend({
  sortProperties: ['voteCount', 'title'],
  sortAscending: false
});

App.IdeaController = Ember.ObjectController.extend({
  auth: null,
  needs: 'auth',
  authBinding: 'controllers.auth',

  displayable: function() {
    return !(Ember.isEmpty(this.get('title')) || this.get('isDirty'));
  }.property('isNew', 'title'),

  isDisabled: function() {
    return Ember.isEmpty(this.get('title'));
  }.property('title'),

  vote: function() {
    var user = this.get('auth.currentUser');
    var vote = App.Vote.createRecord({ voter: user, idea: this.get('model'), createdAt: new Date() });
    App.store.commit();
  },

  undoVote: function() {
    var idea = this.get('model');
    var user = this.get('auth.currentUser');
    var vote = idea.voteOf(user);
    vote.deleteRecord();
    App.store.commit();
  },

  usersVote: function() {
    var user = this.get('auth.currentUser');
    return this.get('model').voteOf(user);
  }.property('auth.currentUser', 'votes.@each'),

  justVoted: function() {
    var vote = this.get('usersVote');
    var fiveSecondsAgo = moment().subtract('seconds', 5);
    return vote && fiveSecondsAgo.isBefore(moment(vote.get('createdAt')));
  }.property('usersVote')
});

App.IdeasNewController = Ember.ObjectController.extend({
  auth: null,
  needs: 'auth',
  authBinding: 'controllers.auth',

  isDisabled: function() {
    return Ember.isEmpty(this.get('title'));
  }.property('title'),

  sendIdea: function() {
    this.set('model.timestamp', new Date());
    App.store.commit();
    this.set('model', App.Idea.createRecord());
  },

  login: function() {
    this.get('auth').login();
  }

});

App.AuthController = Ember.Controller.extend({
  authed: false,
  currentUser: null,

  init: function() {
    this.authClient = new FirebaseSimpleLogin(App.store.adapter.fb, function(error, githubUser) {
      if (error) {
      } else if (githubUser) {
        this.set('authed', true);
        var user = App.User.find(githubUser.username);
        user.one('didLoad', function() {
          if (!user.get('name')) {
            user.setProperties({
              id: githubUser.username,
              name: githubUser.username,
              displayName: githubUser.displayName,
              avatarUrl: githubUser.avatar_url
            });
            App.store.commit();
          }
        }.bind(this));
        this.set('currentUser', user);
      } else {
        this.set('authed', false);
      }
    }.bind(this));
  },

  login: function() {
    this.authClient.login('github');
  },

  logout: function() {
    this.authClient.logout();
  }

});

Ember.Handlebars.registerBoundHelper('votersSentence', function(votes, options) {
  var currentUser = options.data.keywords.controller.get('auth.currentUser')
  var sentence = ["Voted by"];
  var voterNames = votes.map(function(vote) {
    var voter = vote.get('voter');
    if (voter === currentUser) {
      return 'you';
    } else {
      return voter.get('name');
    }
  });

  var votesCount = votes.get('length');
  if (!votesCount) {
    sentence.push("nobody yet");
  } else {
    if (votesCount == 1) {
      sentence.push("<em>" + voterNames[0] + "</em>");
    } else {
      // Sort
      var sortedNames = [];
      var youIndex = voterNames.indexOf("you");
      if  (youIndex != -1) {
        sortedNames = ["you"].concat(voterNames.slice(0, youIndex)).concat(voterNames.slice(youIndex + 1));
      } else {
        sortedNames = voterNames;
      }
      sortedNames = sortedNames.map(function(name) {
        return "<em>" + name + "</em>";
      });
      butlast = sortedNames.slice(0, votesCount - 1);
      sentence.push(butlast.join(', '));
      sentence.push('and ' + sortedNames[voterNames.length - 1]);
    }
  }
  return new Handlebars.SafeString(sentence.join(' '));
}, '@each');

App.VoteButton = Ember.View.extend({
  templateName: 'voteButton',

  votedAt: function() {
    var votedAt = this.get('vote.createdAt');
    return (votedAt ? moment(votedAt).fromNow() : null);
  }.property('vote'),

  justVoted: function() {
    if (!this.get('vote')) {
      return null;
    }
    var tenSeconds = moment.duration(10, 'seconds');
    return moment(this.get('vote.createdAt')).isAfter(moment().subtract(tenSeconds));
  }.property('vote'),

  tick: function() {
    //NOTE: This observer does not get triggered on some occasions
    var nextTick = Ember.run.later(this, function() {
      this.notifyPropertyChange('vote');
      this.cancelTick();
    }, 11 * 1000);
    this.set('nextTick', nextTick);
  }.observes('vote'),

  willDestroyElement: function() {
    this.cancelTick();
  },

  cancelTick: function() {
    var nextTick = this.get('nextTick');
    if (nextTick) {
      Ember.run.cancel(nextTick);
    }
  }

});
