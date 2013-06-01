App = Ember.Application.create();

App.store = DS.Store.create({
  revision: 12,
  adapter: DS.Firebase.Adapter.create({
    dbName: 'ideavote' //TODO: later should come from environment var
  })
});

App.Idea = DS.Firebase.Model.extend({
  title: DS.attr('string'),
  voters: DS.hasMany('App.User'),
  timestamp: DS.attr('date'),

  isVotedBy: function(user) {
    return this.get('voters').contains(user);
  }
});

App.User = DS.Firebase.Model.extend({
  name: DS.attr('string'),
  displayName: DS.attr('string'),
  avatarUrl: DS.attr('string'),
  displayName: DS.attr('string'),
  votesLeft: DS.attr('number', { defaultValue: 10 })
})

App.Router.map(function() {
  this.resource('ideas', function() {
    this.route('new');
  });
});

App.ApplicationRoute = Ember.Route.extend({
  setupController: function() {
    //NOTE: This is needed so that users are loaded and displayed correctly as voters
    return App.User.find();
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

App.IdeaController = Ember.ObjectController.extend({
  auth: null,
  needs: 'auth',
  authBinding: 'controllers.auth',

  vote: function() {
    var user = this.get('auth.currentUser');
    this.get('model').get('voters').pushObject(user);
    App.store.commit();
  },

  voted: function() {
    var user = this.get('auth.currentUser');
    return this.get('model').isVotedBy(user);
  }.property('model.voters.@each')
});

App.IdeasNewController = Ember.ObjectController.extend({
  auth: null,
  needs: 'auth',
  authBinding: 'controllers.auth',

  sendIdea: function() {
    this.set('model.timestamp', new Date());
    App.store.commit();
  },

  login: function() {
    this.get('auth').login();
  }

});

App.AuthController = Ember.Controller.extend({
  authed: false,
  currentUser: null,

  init: function() {
    this.authClient = new FirebaseAuthClient(App.store.adapter.fb, function(error, githubUser) {
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
              avatarUrl: githubUser.avatar_url,
              votesLeft: 10 // defaultValue does not work if record was fetched from find
            });
            App.store.commit();
          }
        }.bind(this));
        this.set('currentUser', user);
      } else {
        console.log("user is logged out");
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

Ember.Handlebars.registerBoundHelper('votersSentence', function(voters, options) {
  var currentUser = options.data.keywords.controller.get('auth.currentUser')
  var sentence = ["Voted by"];
  var voterNames = voters.map(function(voter) {
    if (voter === currentUser) {
      return 'you';
    } else {
      return voter.get('name');
    }
  });
  var votersCount = voterNames.length;

  if (!votersCount) {
    sentence.push("nobody yet");
  } else {
    if (votersCount == 1) {
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
      butlast = sortedNames.slice(0, votersCount - 1);
      sentence.push(butlast.join(', '));
      sentence.push('and ' + sortedNames[voterNames.length - 1]);
    }
  }
  return new Handlebars.SafeString(sentence.join(' '));
});
