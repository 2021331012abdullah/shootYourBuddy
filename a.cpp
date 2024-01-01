#include <iostream>
#include <unistd.h>
#include <time.h>
#include <errno.h>
#include <chrono>
#include <math.h>
using namespace std;
using namespace chrono;


void msleep(long msec)
{
    struct timespec ts;
    int res;
    if (msec < 0)
    {
        errno = EINVAL;
        return;
    }
    ts.tv_sec = msec / 1000;
    ts.tv_nsec = (msec % 1000) * 1000000;
    do
    {
        res = nanosleep(&ts, &ts);
    } while (res && errno == EINTR);
    return;
}

int main(int argc, char **argv)
{

    if (argc != 4)
        return -1;
    int moveFrames = stoi(argv[1]) / 15;
    int shootFrames = stoi(argv[2]) / 15;
    int angleDilemma = stoi(argv[3]);

    high_resolution_clock::time_point start = high_resolution_clock::now();
    auto nanos = duration_cast<nanoseconds>(start.time_since_epoch()).count();
    srand(nanos % 2000000000);

    int moveAngle1 = (rand() % 360);
    int moveAngleNext1 = (rand() % 360);
    int moveAngle2 = (rand() % 360);
    int moveAngleNext2 = (rand() % 360);


    high_resolution_clock::time_point last_change = high_resolution_clock::now();
    int cntMove = 0;
    int cntShoot = 0;
    while (1)
    {

        cntMove++;
        if (cntMove == moveFrames)
        {
            cntMove = 0;
            last_change = high_resolution_clock::now();
            moveAngle1 = moveAngleNext1;
            moveAngleNext1 = (rand() % 360) +(45*(rand()%8));
            moveAngle2 = moveAngleNext2;
            moveAngleNext2 = (rand() % 360) +(45*(rand()%8));
        }
        cout <<"mv" << moveAngle1 <<" " <<moveAngle2 << "\n";
        cout.flush();


        cntShoot++;
        if (cntShoot == shootFrames)
        {
            cntShoot = 0;
            cout <<"sh" <<(rand() % angleDilemma)*(rand()%2 ? 1 :-1) <<" " <<(rand() % angleDilemma)*(rand()%2 ? 1 :-1) <<"\n";
            cout.flush();
        }


        msleep(15);
    }

    return 0;
}
