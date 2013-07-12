require 'bundler/setup'

require 'sinatra'

class App < Sinatra::Base

  set :db_name, 'bcug-ideavote'

  get '/' do
    erb :index, locals: { db_name: "#{settings.db_name}-#{settings.environment}" }
  end
end
