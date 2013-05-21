App = Ember.Application.create();

App.store = DS.Store.create({
  revision: 12,
  adapter: DS.RESTAdapter.create({
    dbName: 'ideavote' // later should come from environment var
  })
});

App.Idea = DS.Model.extend({
  title: DS.attr('string'),
  voters: DS.hasMany('App.User')
});

App.User = DS.Model.extend({
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

