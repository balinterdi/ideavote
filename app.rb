require 'bundler/setup'

require 'sinatra'

class App < Sinatra::Base
  get '/' do
    erb :index, locals: { db_name: "ideavote-#{settings.environment}" }
  end
end
