require 'bundler/setup'

require 'sinatra'

get '/' do
  erb :index, locals: { db_name: "ideavote-#{settings.environment}" }
end
