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
  model: function() {
    return App.Idea.find();
  }
});

App.ApplicationController = Ember.ArrayController.extend({
  sendIdea: function() {
    var idea = App.Idea.createRecord({
      title: "Great idea",
      timestamp: new Date()
    });
    App.store.commit();
  }
});
