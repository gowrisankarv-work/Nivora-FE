// Frontend CI/CD - watches frontend/** only, builds whatever branch triggered it
// (env.BRANCH_NAME is set automatically by a Jenkins Multibranch Pipeline job - no branch name
// is ever hardcoded below), and deploys to the EC2 host only when that branch is DEPLOY_BRANCH.
//
// Requires, configured once in Jenkins (see frontend/README.md "CI/CD" section):
//   - Multibranch Pipeline job pointed at this repo, Script Path: frontend/Jenkinsfile
//   - Tools: a NodeJS installation (Manage Jenkins > Tools), named below
//   - Credential nivora-ec2-ssh-key: SSH private key for the EC2 deploy user (shared with backend/Jenkinsfile)
//   - Docker CLI available on the Jenkins agent (for the image build stage)
pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
    }

    tools {
        nodejs 'node22'
    }

    environment {
        DEPLOY_BRANCH   = 'main'
        REMOTE_HOST     = 'deploy@nivora.techlogicq.in'
        REMOTE_APP_DIR  = '/opt/nivora'
        SSH_CRED_ID     = 'nivora-ec2-ssh-key'
        IMAGE_TAG       = "nivora-frontend:${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            when { changeset 'frontend/**' }
            steps {
                dir('frontend') {
                    sh 'npm ci'
                }
            }
        }

        stage('i18n parity check') {
            when { changeset 'frontend/**' }
            steps {
                dir('frontend') {
                    sh '''
                        node -e "
                        const en = require('./src/i18n/en.json');
                        const ta = require('./src/i18n/ta.json');
                        function flatten(obj, prefix) {
                          prefix = prefix || '';
                          let keys = [];
                          for (const k in obj) {
                            const full = prefix ? prefix + '.' + k : k;
                            if (typeof obj[k] === 'object' && obj[k] !== null) keys = keys.concat(flatten(obj[k], full));
                            else keys.push(full);
                          }
                          return keys;
                        }
                        const enKeys = new Set(flatten(en));
                        const taKeys = new Set(flatten(ta));
                        const missing = [...enKeys].filter(k => !taKeys.has(k)).concat([...taKeys].filter(k => !enKeys.has(k)));
                        if (missing.length) { console.error('Missing i18n keys:', missing); process.exit(1); }
                        "
                    '''
                }
            }
        }

        stage('Type-check and build') {
            when { changeset 'frontend/**' }
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        stage('Build image') {
            when { changeset 'frontend/**' }
            steps {
                dir('frontend') {
                    sh "docker build -t ${IMAGE_TAG} ."
                }
            }
        }

        stage('Deploy') {
            when {
                allOf {
                    branch "${DEPLOY_BRANCH}"
                    changeset 'frontend/**'
                }
            }
            steps {
                sshagent(credentials: ["${SSH_CRED_ID}"]) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${REMOTE_HOST} '
                            set -e
                            cd ${REMOTE_APP_DIR}
                            git fetch origin ${DEPLOY_BRANCH}
                            git checkout ${DEPLOY_BRANCH}
                            git reset --hard origin/${DEPLOY_BRANCH}
                            docker compose build frontend
                            docker compose up -d frontend
                            docker image prune -f
                        '
                    """
                }
                sh """
                    curl -sf --retry 5 --retry-delay 5 --retry-connrefused \
                        https://nivora.techlogicq.in/ > /dev/null
                """
            }
        }
    }

    post {
        success {
            echo "Frontend ${IMAGE_TAG} built${env.BRANCH_NAME == env.DEPLOY_BRANCH ? ' and deployed to nivora.techlogicq.in' : ''}."
        }
        failure {
            echo "Frontend pipeline failed on branch ${env.BRANCH_NAME} (build #${env.BUILD_NUMBER})."
        }
    }
}
