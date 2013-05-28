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
  timestamp: DS.attr('date')
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

App.ApplicationController = Ember.ArrayController.extend({
  needs: ['auth'],
  authBinding: 'controllers.auth',

  login: function() {
    this.get('auth').login();
  },

  logout: function() {
    this.get('auth').logout();
  }
});

App.IdeasNewController = Ember.ObjectController.extend({
  needs: ['auth'],
  //TODO: This fails, dunno why
  // authBinding: 'controllers.auth',
  sendIdea: function() {
    this.set('model.timestamp', new Date());
    App.store.commit();
  },

  login: function() {
    this.get('controllers.auth').login();
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

})
