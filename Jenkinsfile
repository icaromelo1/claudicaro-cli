// CI do Jenkins da VM (icaromelodev.com.br/jenkins): lint, testes e build em toda branch e PR.
@Library('vm') _

pipeline {
  agent { label 'vm' }

  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
  }

  stages {
    stage('CI') {
      steps {
        script {
          docker.image('node:22').inside(ambienteNode()) {
            sh 'npm ci && npx prisma generate && npm run lint && npm run test && npm run build'
          }
        }
      }
    }
  }

  post {
    always { cleanWs(deleteDirs: true, notFailBuild: true) }
  }
}
