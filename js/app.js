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
  nickname: DS.attr('string'),
  votesLeft: DS.attr('integer')
})

App.Router.map(function() {
  // put your routes here
});

App.IndexRoute = Ember.Route.extend({
  setupController: function() {
    this.controllerFor('idea').set('model', App.Idea.createRecord());
  },
  model: function() {
    return App.Idea.find();
  }
});

App.ApplicationController = Ember.ArrayController.extend({
  needs: ['auth'],
  authBinding: 'controllers.auth',

  login: function() {
    this.get('auth').login();
  }
});

App.IdeaController = Ember.ObjectController.extend({
  sendIdea: function() {
    this.set('model.timestamp', new Date());
    App.store.commit();
  }
})

App.AuthController = Ember.Controller.extend({
  authed: false,

  init: function() {
    this.authClient = new FirebaseAuthClient(App.store.adapter.fb, function(error, user) {
      if (error) {
        console.log(error);
      } else if (user) {
        console.log(user);
        //TODO: Make an own App.User class and store the following properties
        // from the github user: username, displayName, avatar_url, profileUrl
        this.set('authed', true);
      } else {
        console.log("user is logged out");
        this.set('authed', false);
      }
    }.bind(this));
  },

  login: function() {
    this.authClient.login('github');
  }


})
